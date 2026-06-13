import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { RoomState, UserSettings } from '../types';
import {
  normalizeRoomState,
  normalizeRoomStateUpdate,
  sanitizeFirestoreData,
} from '../utils/gameSettings';
import { normalizeUserSettings } from '../utils/userSettings';
import { db } from './firebase';

const ROOM_COLLECTION = 'rooms';
const ROOM_ARCHIVE_COLLECTION = 'state';
const ROOM_ARCHIVE_DOCUMENT = 'archive';
const USER_SETTINGS_COLLECTION = 'userSettings';

const snapshotExists = (snapshot: { exists?: () => boolean } | null | undefined): boolean => {
  return typeof snapshot?.exists === 'function' ? snapshot.exists() : false;
};

const readSnapshotData = <T>(snapshot: { data?: () => T } | null | undefined): T | null => {
  if (!snapshot || typeof snapshot.data !== 'function') {
    return null;
  }

  return snapshot.data();
};

/**
 * Check if the user has any anonymous data associated with their UID.
 */
export const checkUserHasAnonymousHistory = async (uid: string): Promise<boolean> => {
  const roomsRef = collection(db, ROOM_COLLECTION);
  const q = query(roomsRef, where('playerIds', 'array-contains', uid));
  const settingsRef = doc(db, USER_SETTINGS_COLLECTION, uid);
  const [snapshot, settingsSnapshot] = await Promise.all([getDocs(q), getDoc(settingsRef)]);

  return !snapshot.empty || settingsSnapshot.exists();
};

const migrateUserSettings = async (
  oldUid: string,
  newUid: string,
  prefetchedUserSettings?: UserSettings | null,
): Promise<void> => {
  const newSettingsRef = doc(db, USER_SETTINGS_COLLECTION, newUid);
  const newSettingsSnapshot = await getDoc(newSettingsRef);

  if (snapshotExists(newSettingsSnapshot)) {
    return;
  }

  const nextUserSettings =
    prefetchedUserSettings !== undefined
      ? prefetchedUserSettings
      : await (async () => {
          const oldSettingsRef = doc(db, USER_SETTINGS_COLLECTION, oldUid);
          const oldSettingsSnapshot = await getDoc(oldSettingsRef);

          if (!snapshotExists(oldSettingsSnapshot)) {
            return null;
          }

          return normalizeUserSettings(readSnapshotData(oldSettingsSnapshot));
        })();

  if (!nextUserSettings) {
    return;
  }

  await setDoc(newSettingsRef, sanitizeFirestoreData(nextUserSettings), { merge: true });
};

/**
 * Migrate all data from oldUid to newUid using a batch operation.
 * This involves deep updates on Room documents.
 */
export const migrateUserData = async (
  oldUid: string,
  newUid: string,
  prefetchedUserSettings?: UserSettings | null,
): Promise<void> => {
  await migrateUserSettings(oldUid, newUid, prefetchedUserSettings);

  const roomsRef = collection(db, ROOM_COLLECTION);
  // Find all rooms where the old user participated
  const q = query(roomsRef, where('playerIds', 'array-contains', oldUid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  let operationCount = 0;

  for (const roomDoc of snapshot.docs) {
    const data = normalizeRoomState(roomDoc.data() as RoomState);
    const roomRef = doc(db, ROOM_COLLECTION, roomDoc.id);
    const roomArchiveRef = doc(
      db,
      ROOM_COLLECTION,
      roomDoc.id,
      ROOM_ARCHIVE_COLLECTION,
      ROOM_ARCHIVE_DOCUMENT,
    );
    const roomArchiveSnapshot = await getDoc(roomArchiveRef);
    const archivedRoomData = snapshotExists(roomArchiveSnapshot)
      ? readSnapshotData<Pick<RoomState, 'gameResults'>>(
          roomArchiveSnapshot as { data?: () => Pick<RoomState, 'gameResults'> },
        )
      : null;
    const gameResults = archivedRoomData?.gameResults ?? data.gameResults;

    // Prepare updates
    const updates: Partial<RoomState> = {};
    let archiveGameResults: RoomState['gameResults'] | undefined;
    let needsUpdate = false;

    // 1. playerIds
    if (data.playerIds.includes(oldUid)) {
      updates.playerIds = data.playerIds.map((id) => (id === oldUid ? newUid : id));
      needsUpdate = true;
    }

    // 2. players
    if (data.players.some((p) => p.id === oldUid)) {
      updates.players = data.players.map((p) => (p.id === oldUid ? { ...p, id: newUid } : p));
      needsUpdate = true;
    }

    // 3. hostId
    if (data.hostId === oldUid) {
      updates.hostId = newUid;
      needsUpdate = true;
    }

    // 4. gameResults
    if (gameResults && gameResults.length > 0) {
      archiveGameResults = gameResults.map((game) => {
        let gameUpdated = false;

        // 4.1 scores
        const newScores = game.scores.map((s) => {
          if (s.playerId === oldUid) {
            gameUpdated = true;
            return { ...s, playerId: newUid };
          }
          return s;
        });

        // 4.2 logs
        const newLogs = game.logs?.map((log) => {
          let logUpdated = false;
          const result = { ...log.result };

          // result.winners
          if (result.winners) {
            const newWinners = result.winners.map((w) => {
              if (w.id === oldUid) {
                logUpdated = true;
                return { ...w, id: newUid };
              }
              return w;
            });
            if (logUpdated) result.winners = newWinners;
          }

          // result.loserId
          if (result.loserId === oldUid) {
            result.loserId = newUid;
            logUpdated = true;
          }

          // result.riichiPlayerIds
          if (result.riichiPlayerIds?.includes(oldUid)) {
            result.riichiPlayerIds = result.riichiPlayerIds.map((id) =>
              id === oldUid ? newUid : id,
            );
            logUpdated = true;
          }

          // result.scoreDeltas
          if (oldUid in result.scoreDeltas) {
            const val = result.scoreDeltas[oldUid];
            delete result.scoreDeltas[oldUid];
            result.scoreDeltas[newUid] = val;
            logUpdated = true;
          }

          if (logUpdated) {
            gameUpdated = true;
            return { ...log, result };
          }
          return log;
        });

        if (gameUpdated) {
          return {
            ...game,
            scores: newScores,
            logs: newLogs,
          };
        }
        return game;
      });

      needsUpdate = true;
    }

    // 5. lastEvent
    if (data.lastEvent && data.lastEvent.deltas && oldUid in data.lastEvent.deltas) {
      const newDeltas = { ...data.lastEvent.deltas };
      newDeltas[newUid] = newDeltas[oldUid];
      delete newDeltas[oldUid];
      updates.lastEvent = {
        ...data.lastEvent,
        deltas: newDeltas,
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      batch.update(
        roomRef,
        sanitizeFirestoreData(
          normalizeRoomStateUpdate({
            ...updates,
            settings: data.settings,
          }),
        ),
      );
      operationCount++;

      if (archiveGameResults) {
        batch.set(
          roomArchiveRef,
          sanitizeFirestoreData({
            gameResults: archiveGameResults,
          }),
          { merge: true },
        );
      }
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
};

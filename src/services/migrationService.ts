import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import type { RoomState } from '../types';
import { db } from './firebase';

const ROOM_COLLECTION = 'rooms';

/**
 * Check if the user has any room history associated with their UID.
 */
export const checkUserHasAnonymousHistory = async (uid: string): Promise<boolean> => {
  const roomsRef = collection(db, ROOM_COLLECTION);
  const q = query(roomsRef, where('playerIds', 'array-contains', uid));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Migrate all data from oldUid to newUid using a batch operation.
 * This involves deep updates on Room documents.
 */
export const migrateUserData = async (oldUid: string, newUid: string): Promise<void> => {
  const roomsRef = collection(db, ROOM_COLLECTION);
  // Find all rooms where the old user participated
  const q = query(roomsRef, where('playerIds', 'array-contains', oldUid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  let operationCount = 0;

  snapshot.docs.forEach((roomDoc) => {
    const data = roomDoc.data() as RoomState;
    const roomRef = doc(db, ROOM_COLLECTION, roomDoc.id);

    // Prepare updates
    const updates: Partial<RoomState> = {};
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
    if (data.gameResults && data.gameResults.length > 0) {
      updates.gameResults = data.gameResults.map((game) => {
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

      // Check if actual changes happened in gameResults mapping is implicitly handled by map returning new refs
      // But we set needsUpdate based on if we touched it.
      // Optimization: we could track `gameUpdated` flag across the map, but simply setting it here is safe.
      // Since we reconstruct the whole array if mapped, it's a replacement.
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
      batch.update(roomRef, updates);
      operationCount++;
    }
  });

  if (operationCount > 0) {
    await batch.commit();
  }
};

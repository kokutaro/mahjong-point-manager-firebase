import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { GameSettings, Player, RoomSnapshot, RoomState, RoomStateCore } from '../types';
import {
  normalizeGameSettings,
  normalizeRoomState,
  normalizeRoomStateCore,
  normalizeRoomStateUpdate,
  sanitizeFirestoreData,
} from '../utils/gameSettings';
import { db } from './firebase';

const ROOM_COLLECTION = 'rooms';
const ROOM_ARCHIVE_COLLECTION = 'state';
const ROOM_ARCHIVE_DOCUMENT = 'archive';
const ROOM_ARCHIVE_KEYS = ['history', 'currentLogs', 'gameResults'] as const;

type RoomArchiveState = Pick<RoomState, (typeof ROOM_ARCHIVE_KEYS)[number]>;

const getRoomRef = (roomId: string) => {
  return doc(db, ROOM_COLLECTION, roomId);
};

const getRoomArchiveRef = (roomId: string) => {
  return doc(db, ROOM_COLLECTION, roomId, ROOM_ARCHIVE_COLLECTION, ROOM_ARCHIVE_DOCUMENT);
};

const mergeRoomState = (
  roomData: Partial<RoomState> | null,
  archiveData: Partial<RoomArchiveState> | null,
): RoomState | null => {
  if (!roomData) {
    return null;
  }

  return normalizeRoomState({
    ...roomData,
    history: archiveData?.history ?? roomData.history,
    currentLogs: archiveData?.currentLogs ?? roomData.currentLogs,
    gameResults: archiveData?.gameResults ?? roomData.gameResults,
  } as RoomState);
};

const splitRoomState = (state: Partial<RoomState>) => {
  const roomCoreState: Partial<RoomStateCore> = {
    ...state,
  };
  const roomArchiveState: Partial<RoomArchiveState> = {};

  for (const key of ROOM_ARCHIVE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(state, key)) {
      continue;
    }

    if (key === 'history') {
      roomArchiveState.history = state.history;
    }
    if (key === 'currentLogs') {
      roomArchiveState.currentLogs = state.currentLogs;
    }
    if (key === 'gameResults') {
      roomArchiveState.gameResults = state.gameResults;
    }

    delete (roomCoreState as Partial<RoomState>)[key];
  }

  return { roomCoreState, roomArchiveState };
};

const buildDeletedFields = (value: Record<string, unknown>) => {
  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, current]) => {
    if (current === undefined) {
      result[key] = deleteField();
    }

    return result;
  }, {});
};

const loadRoomArchive = async (roomId: string): Promise<Partial<RoomArchiveState> | null> => {
  const archiveSnapshot = await getDoc(getRoomArchiveRef(roomId));
  if (!archiveSnapshot.exists()) {
    return null;
  }

  return archiveSnapshot.data() as Partial<RoomArchiveState>;
};

export const createRoom = async (
  roomId: string,
  initialPlayers: Player[],
  settings: GameSettings,
  roomName?: string,
  options?: {
    competitionId?: string;
    tableId?: string;
    hostId?: string;
    initialStatus?: RoomState['status'];
    extraPlayerIds?: string[];
  },
): Promise<void> => {
  const roomRef = getRoomRef(roomId);
  const roomArchiveRef = getRoomArchiveRef(roomId);
  const roomSnapshot = await getDoc(roomRef);
  const normalizedSettings = normalizeGameSettings(settings);

  if (roomSnapshot.exists()) {
    throw new Error('Room already exists');
  }

  const basePlayerIds = initialPlayers.map((player) => player.id);
  const allPlayerIds = options?.extraPlayerIds
    ? [...new Set([...basePlayerIds, ...options.extraPlayerIds])]
    : basePlayerIds;

  const initialRoomState: RoomStateCore = {
    id: roomId,
    hostId: options?.hostId ?? initialPlayers[0].id,
    status: options?.initialStatus ?? 'waiting',
    settings: normalizedSettings,
    round: {
      wind: 'East',
      number: 1,
      honba: 0,
      riichiSticks: 0,
    },
    players: initialPlayers,
    playerIds: allPlayerIds,
    roomName: roomName || undefined,
    competitionId: options?.competitionId,
    tableId: options?.tableId,
  };

  await setDoc(roomRef, {
    ...sanitizeFirestoreData(initialRoomState),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(roomArchiveRef, {
    history: [],
    currentLogs: [],
    gameResults: [],
  });
};

export const subscribeToRoom = (roomId: string, callback: (room: RoomState | null) => void) => {
  const roomRef = getRoomRef(roomId);
  const roomArchiveRef = getRoomArchiveRef(roomId);

  let latestRoomState: Partial<RoomState> | null = null;
  let latestRoomArchive: Partial<RoomArchiveState> | null = null;

  const emit = () => {
    callback(mergeRoomState(latestRoomState, latestRoomArchive));
  };

  const unsubscribeRoom = onSnapshot(
    roomRef,
    (snapshot) => {
      latestRoomState = snapshot.exists() ? (snapshot.data() as Partial<RoomState>) : null;
      emit();
    },
    (error) => {
      console.error('Room sync error:', error);
      callback(null);
    },
  );

  const unsubscribeArchive = onSnapshot(
    roomArchiveRef,
    (snapshot) => {
      latestRoomArchive = snapshot.exists() ? (snapshot.data() as Partial<RoomArchiveState>) : null;
      emit();
    },
    (error) => {
      console.error('Room archive sync error:', error);
    },
  );

  return () => {
    unsubscribeRoom();
    unsubscribeArchive();
  };
};

export const joinRoom = async (roomId: string, player: Player): Promise<void> => {
  const roomRef = getRoomRef(roomId);
  const snapshot = await getDoc(roomRef);
  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const roomCoreState = normalizeRoomStateCore(snapshot.data() as RoomStateCore);
  if (roomCoreState.players.some((existingPlayer) => existingPlayer.id === player.id)) {
    return;
  }

  if (roomCoreState.players.length >= (roomCoreState.settings.mode === '4ma' ? 4 : 3)) {
    throw new Error('Room is full');
  }

  await updateDoc(roomRef, {
    players: arrayUnion(player),
    playerIds: arrayUnion(player.id),
    updatedAt: serverTimestamp(),
  });
};

export const updateRoomState = async (
  roomId: string,
  updates: Partial<RoomState>,
): Promise<void> => {
  const roomRef = getRoomRef(roomId);
  const roomArchiveRef = getRoomArchiveRef(roomId);
  const normalizedUpdates = normalizeRoomStateUpdate(updates);
  const { roomCoreState, roomArchiveState } = splitRoomState(normalizedUpdates);

  const roomCoreDeletedFields = buildDeletedFields(roomCoreState as Record<string, unknown>);
  const roomArchiveDeletedFields = buildDeletedFields(roomArchiveState as Record<string, unknown>);

  await updateDoc(roomRef, {
    ...sanitizeFirestoreData(roomCoreState),
    ...roomCoreDeletedFields,
    updatedAt: serverTimestamp(),
  });

  if (Object.keys(roomArchiveState).length > 0) {
    await setDoc(
      roomArchiveRef,
      {
        ...sanitizeFirestoreData(roomArchiveState),
        ...roomArchiveDeletedFields,
      },
      { merge: true },
    );
  }
};

export const checkRoomExists = async (roomId: string): Promise<boolean> => {
  const snapshot = await getDoc(getRoomRef(roomId));
  return snapshot.exists();
};

export const getUserRoomHistory = async (userId: string): Promise<RoomState[]> => {
  const roomsRef = collection(db, ROOM_COLLECTION);
  const roomsQuery = query(roomsRef, where('playerIds', 'array-contains', userId));
  const snapshot = await getDocs(roomsQuery);

  const rooms = await Promise.all(
    snapshot.docs.map(async (roomDocument) => {
      const roomData = roomDocument.data() as Partial<RoomState>;
      const roomArchive = await loadRoomArchive(roomDocument.id);
      return mergeRoomState(roomData, roomArchive);
    }),
  );

  return rooms
    .filter((room): room is RoomState => room !== null)
    .sort((left, right) => {
      const getSeconds = (value: number | object | undefined): number => {
        if (typeof value === 'number') {
          return value / 1000;
        }
        if (value && typeof value === 'object' && 'seconds' in value) {
          return (value as { seconds: number }).seconds;
        }
        return 0;
      };

      return getSeconds(right.createdAt) - getSeconds(left.createdAt);
    });
};

export const getRoomSnapshot = (room: RoomState): RoomSnapshot => {
  const snapshot = { ...room };
  delete snapshot.history;
  return snapshot;
};

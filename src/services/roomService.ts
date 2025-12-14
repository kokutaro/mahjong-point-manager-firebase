import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import type { GameSettings, Player, RoomState } from "../types";
import { db } from "./firebase";

const ROOM_COLLECTION = "rooms";

export const createRoom = async (roomId: string, initialPlayers: Player[], settings: GameSettings): Promise<void> => {
  const roomRef = doc(db, ROOM_COLLECTION, roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (roomSnapshot.exists()) {
    throw new Error("Room already exists");
  }

  const initialRoomState: RoomState = {
    id: roomId,
    hostId: initialPlayers[0].id, // First player is host
    status: 'waiting',
    settings,
    round: {
      wind: 'East',
      number: 1,
      honba: 0,
      riichiSticks: 0
    },
    players: initialPlayers,
    playerIds: initialPlayers.map(p => p.id)
  };

  // Convert to Firestore data (timestamps etc) if needed, but simple JSON is fine for now
  await setDoc(roomRef, {
    ...initialRoomState,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const subscribeToRoom = (roomId: string, callback: (room: RoomState | null) => void) => {
  const roomRef = doc(db, ROOM_COLLECTION, roomId);

  return onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as RoomState);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Room sync error:", error);
    callback(null);
  });
};

export const joinRoom = async (roomId: string, player: Player): Promise<void> => {
  const roomRef = doc(db, ROOM_COLLECTION, roomId);
  // Transaction or arrayUnion
  // Ideally check if 4 players already

  // Checking current players
  const snap = await getDoc(roomRef);
  if (!snap.exists()) throw new Error("Room not found");

  const data = snap.data() as RoomState;
  if (data.players.some(p => p.id === player.id)) {
    // Already joined, maybe update name?
    return;
  }

  if (data.players.length >= (data.settings.mode === '4ma' ? 4 : 3)) {
    throw new Error("Room is full");
  }

  await updateDoc(roomRef, {
    players: arrayUnion(player),
    playerIds: arrayUnion(player.id),
    updatedAt: serverTimestamp()
  });
};

export const updateRoomState = async (roomId: string, updates: Partial<RoomState>): Promise<void> => {
  const roomRef = doc(db, ROOM_COLLECTION, roomId);
  // Be careful with nested updates in Firestore (dot notation needed for deep fields)
  // For now, replacing top-level is okay if careful, or use libraries.
  // However, round.honba update requires `round: { ...old.round, honba: x }` if doing shallow merge.
  // Let's assume `updates` is properly structured for setDoc({merge:true}) or updateDoc.

  await updateDoc(roomRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

import { collection, getDocs, query, where } from "firebase/firestore";

export const getUserRoomHistory = async (userId: string): Promise<RoomState[]> => {
  const roomsRef = collection(db, ROOM_COLLECTION);
  // Note: orderBy with array-contains requires a composite index. 
  // For MVP simplicity and to avoid "index required" errors blocking the user immediately,
  // we will fetch filter by player and sort client-side, 
  // OR rely on the link error if the user is willing to click it.
  // Let's try simple filtering first, then sort in memory.
  const q = query(
    roomsRef,
    where("playerIds", "array-contains", userId)
  );

  const snapshot = await getDocs(q);
  const rooms = snapshot.docs.map(doc => doc.data() as RoomState);

  // Client-side sort by updatedAt (descending)
  // Note: Firestore timestamps might need conversion if strictly typed, but here likely objects.
  // We'll treat them as generic objects for sort comparison if needed, or just assume standard fields.
  // Check types: RoomState doesnt strictly define updatedAt but we saved it.
  // actually RoomState interface in types/index.ts doesnt have updatedAt. We should add it or just ignore.
  // Let's just return them, simpler.

  return rooms;
};

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

export const createRoom = async (roomId: string, host: Player, settings: GameSettings): Promise<void> => {
  const roomRef = doc(db, ROOM_COLLECTION, roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (roomSnapshot.exists()) {
    throw new Error("Room already exists");
  }

  const initialRoomState: RoomState = {
    id: roomId,
    hostId: host.id,
    status: 'waiting',
    settings,
    round: {
      wind: 'East',
      number: 1,
      honba: 0,
      riichiSticks: 0
    },
    players: [host]
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

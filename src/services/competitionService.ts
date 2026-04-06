import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type {
  Competition,
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionTable,
} from '../types';
import { sanitizeFirestoreData } from '../utils/gameSettings';
import { generateId } from '../utils/id';
import { assignDefaultSeats, computeTableStatus, getTableCapacity } from '../utils/tableLogic';
import { auth, db } from './firebase';

export const COMPETITION_COLLECTION = 'competitions';

// --- Competition CRUD ---

export const createCompetition = async (
  competition: Omit<Competition, 'createdAt'>,
  passcodeHash?: string,
): Promise<void> => {
  const competitionRef = doc(db, COMPETITION_COLLECTION, competition.id);

  if (passcodeHash) {
    const secretRef = doc(db, COMPETITION_COLLECTION, competition.id, 'secrets', 'config');
    const batch = writeBatch(db);
    batch.set(competitionRef, {
      ...sanitizeFirestoreData(competition),
      createdAt: serverTimestamp(),
    });
    batch.set(secretRef, { passcodeHash });
    await batch.commit();
  } else {
    await setDoc(competitionRef, {
      ...sanitizeFirestoreData(competition),
      createdAt: serverTimestamp(),
    });
  }
};

export const subscribeToCompetition = (
  id: string,
  callback: (data: Competition | null) => void,
) => {
  const competitionRef = doc(db, COMPETITION_COLLECTION, id);

  return onSnapshot(
    competitionRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Competition);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Competition sync error:', error);
      callback(null);
    },
  );
};

export const updateCompetition = async (
  id: string,
  updates: Partial<Competition>,
): Promise<void> => {
  const competitionRef = doc(db, COMPETITION_COLLECTION, id);
  await updateDoc(competitionRef, updates);
};

// --- Participant operations (subcollection) ---

export const addParticipant = async (
  competitionId: string,
  participant: Omit<CompetitionParticipant, 'joinedAt'>,
): Promise<void> => {
  const participantRef = doc(
    db,
    COMPETITION_COLLECTION,
    competitionId,
    'participants',
    participant.id,
  );
  await setDoc(participantRef, {
    ...participant,
    joinedAt: serverTimestamp(),
  });
};

export const subscribeToParticipants = (
  competitionId: string,
  callback: (data: CompetitionParticipant[]) => void,
) => {
  const participantsRef = collection(db, COMPETITION_COLLECTION, competitionId, 'participants');

  return onSnapshot(
    participantsRef,
    (snapshot) => {
      const participants = snapshot.docs.map((d) => d.data() as CompetitionParticipant);
      callback(participants);
    },
    (error) => {
      console.error('Participants sync error:', error);
      callback([]);
    },
  );
};

export const updateParticipant = async (
  competitionId: string,
  participantId: string,
  updates: Partial<CompetitionParticipant>,
): Promise<void> => {
  const participantRef = doc(
    db,
    COMPETITION_COLLECTION,
    competitionId,
    'participants',
    participantId,
  );
  await updateDoc(participantRef, updates);
};

export const removeParticipant = async (
  competitionId: string,
  participantId: string,
): Promise<void> => {
  const participantRef = doc(
    db,
    COMPETITION_COLLECTION,
    competitionId,
    'participants',
    participantId,
  );
  await deleteDoc(participantRef);
};

export const getParticipant = async (
  competitionId: string,
  participantId: string,
): Promise<CompetitionParticipant | null> => {
  const participantRef = doc(
    db,
    COMPETITION_COLLECTION,
    competitionId,
    'participants',
    participantId,
  );
  const snapshot = await getDoc(participantRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as CompetitionParticipant;
};

// --- Table operations (subcollection) ---

export const createTable = async (
  competitionId: string,
  table: Omit<CompetitionTable, 'createdAt' | 'gameCount'>,
): Promise<void> => {
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', table.id);
  await setDoc(tableRef, {
    ...table,
    gameCount: 0,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToTables = (
  competitionId: string,
  callback: (data: CompetitionTable[]) => void,
) => {
  const tablesRef = collection(db, COMPETITION_COLLECTION, competitionId, 'tables');

  return onSnapshot(
    tablesRef,
    (snapshot) => {
      const tables = snapshot.docs.map((d) => d.data() as CompetitionTable);
      callback(tables);
    },
    (error) => {
      console.error('Tables sync error:', error);
      callback([]);
    },
  );
};

export const updateTable = async (
  competitionId: string,
  tableId: string,
  updates: Partial<CompetitionTable>,
): Promise<void> => {
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', tableId);
  await updateDoc(tableRef, updates);
};

export const deleteTable = async (competitionId: string, tableId: string): Promise<void> => {
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', tableId);
  await deleteDoc(tableRef);
};

// --- GameResult operations (subcollection) ---

export const addGameResult = async (
  competitionId: string,
  result: CompetitionGameResult,
): Promise<void> => {
  const resultRef = doc(db, COMPETITION_COLLECTION, competitionId, 'gameResults', result.id);
  await setDoc(resultRef, result);
};

export const subscribeToGameResults = (
  competitionId: string,
  callback: (data: CompetitionGameResult[]) => void,
) => {
  const resultsRef = collection(db, COMPETITION_COLLECTION, competitionId, 'gameResults');

  return onSnapshot(
    resultsRef,
    (snapshot) => {
      const results = snapshot.docs.map((d) => d.data() as CompetitionGameResult);
      callback(results);
    },
    (error) => {
      console.error('GameResults sync error:', error);
      callback([]);
    },
  );
};

// --- Query operations ---

export const getUserCompetitions = async (userId: string): Promise<Competition[]> => {
  const q = query(collection(db, COMPETITION_COLLECTION), where('organizerId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as Competition);
};

// --- Passcode ---

/**
 * Store the passcode hash in the secrets subcollection (not on the competition
 * document) so that Firestore security rules can prevent clients from reading it.
 */
export const savePasscodeSecret = async (
  competitionId: string,
  passcodeHash: string,
): Promise<void> => {
  const secretRef = doc(db, COMPETITION_COLLECTION, competitionId, 'secrets', 'config');
  await setDoc(secretRef, { passcodeHash });
};

/**
 * Write-based passcode verification.  The client computes the hash locally and
 * writes it to the verifications subcollection.  The Firestore security rule
 * compares the written hash against the stored secret — if the write succeeds
 * the passcode is correct; if it is denied the passcode is wrong.
 *
 * This pattern ensures the passcode hash is never transferred to the client.
 */
export const verifyPasscode = async (
  competitionId: string,
  inputPasscode: string,
): Promise<boolean> => {
  const competitionRef = doc(db, COMPETITION_COLLECTION, competitionId);
  const snapshot = await getDoc(competitionRef);
  if (!snapshot.exists()) return false;
  const data = snapshot.data() as Competition;
  if (!data.hasPasscode) return true;

  const { hashPasscode } = await import('../utils/hash');
  const inputHash = await hashPasscode(inputPasscode, competitionId);

  const userId = auth.currentUser?.uid;
  if (!userId) return false;

  try {
    const verificationRef = doc(db, COMPETITION_COLLECTION, competitionId, 'verifications', userId);
    await setDoc(verificationRef, { hash: inputHash });
    return true;
  } catch {
    return false;
  }
};

// --- Co-organizer operations ---

export const appointCoOrganizer = async (
  competitionId: string,
  participantId: string,
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);
  const competitionRef = doc(db, COMPETITION_COLLECTION, competitionId);
  const participantRef = doc(
    db,
    COMPETITION_COLLECTION,
    competitionId,
    'participants',
    participantId,
  );
  batch.update(competitionRef, { coOrganizerIds: arrayUnion(userId) });
  batch.update(participantRef, { role: 'co_organizer' });
  await batch.commit();
};

export const removeCoOrganizer = async (
  competitionId: string,
  participantId: string,
  userId: string,
): Promise<void> => {
  const batch = writeBatch(db);
  const competitionRef = doc(db, COMPETITION_COLLECTION, competitionId);
  const participantRef = doc(
    db,
    COMPETITION_COLLECTION,
    competitionId,
    'participants',
    participantId,
  );
  batch.update(competitionRef, { coOrganizerIds: arrayRemove(userId) });
  batch.update(participantRef, { role: 'player' });
  await batch.commit();
};

// --- Guest participant ---

export const addGuestParticipant = async (competitionId: string, name: string): Promise<void> => {
  const id = generateId();
  await addParticipant(competitionId, {
    id,
    name,
    isGuest: true,
    role: 'player',
    status: 'idle',
  });
};

// --- Table assignment operations ---

export const assignPlayerToTable = async (
  competitionId: string,
  tableId: string,
  table: CompetitionTable,
  participantId: string,
): Promise<void> => {
  const capacity = getTableCapacity(table.mode);
  const newPlayerIds = [...table.playerIds, participantId];
  const newStatus = computeTableStatus(newPlayerIds.length, capacity);
  const newSeats = assignDefaultSeats(newPlayerIds, table.mode);

  const batch = writeBatch(db);
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', tableId);
  const participantRef = doc(
    db,
    COMPETITION_COLLECTION,
    competitionId,
    'participants',
    participantId,
  );
  batch.update(tableRef, { playerIds: newPlayerIds, status: newStatus, seatAssignment: newSeats });
  batch.update(participantRef, { status: 'assigned', currentTableId: tableId });
  await batch.commit();
};

export const unassignPlayerFromTable = async (
  competitionId: string,
  tableId: string,
  table: CompetitionTable,
  participantId: string,
): Promise<void> => {
  const capacity = getTableCapacity(table.mode);
  const newPlayerIds = table.playerIds.filter((id) => id !== participantId);
  const newStatus = computeTableStatus(newPlayerIds.length, capacity);
  const currentSeats = table.seatAssignment ?? {};
  const remainingSeats = Object.fromEntries(
    Object.entries(currentSeats).filter(([id]) => id !== participantId),
  );

  const batch = writeBatch(db);
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', tableId);
  const participantRef = doc(
    db,
    COMPETITION_COLLECTION,
    competitionId,
    'participants',
    participantId,
  );
  batch.update(tableRef, {
    playerIds: newPlayerIds,
    status: newStatus,
    seatAssignment: remainingSeats,
  });
  batch.update(participantRef, { status: 'idle', currentTableId: '' });
  await batch.commit();
};

export const deleteTableWithCleanup = async (
  competitionId: string,
  tableId: string,
  playerIds: string[],
): Promise<void> => {
  const batch = writeBatch(db);
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', tableId);
  for (const pid of playerIds) {
    const participantRef = doc(db, COMPETITION_COLLECTION, competitionId, 'participants', pid);
    batch.update(participantRef, { status: 'idle', currentTableId: '' });
  }
  batch.delete(tableRef);
  await batch.commit();
};

// --- Match operations ---

export const startTableMatch = async (
  competitionId: string,
  tableId: string,
  roomId: string,
  playerIds: string[],
): Promise<void> => {
  const batch = writeBatch(db);
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', tableId);
  batch.update(tableRef, { status: 'playing', currentRoomId: roomId });
  for (const pid of playerIds) {
    const participantRef = doc(db, COMPETITION_COLLECTION, competitionId, 'participants', pid);
    batch.update(participantRef, { status: 'playing' });
  }
  await batch.commit();
};

export const saveCompetitionGameResult = async (
  competitionId: string,
  result: CompetitionGameResult,
): Promise<void> => {
  await addGameResult(competitionId, result);
};

export const startNextTableMatch = async (
  competitionId: string,
  tableId: string,
  newRoomId: string,
  newGameCount: number,
): Promise<void> => {
  const batch = writeBatch(db);
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', tableId);
  batch.update(tableRef, { currentRoomId: newRoomId, gameCount: newGameCount });
  await batch.commit();
};

export const dissolveTable = async (
  competitionId: string,
  tableId: string,
  playerIds: string[],
): Promise<void> => {
  const batch = writeBatch(db);
  const tableRef = doc(db, COMPETITION_COLLECTION, competitionId, 'tables', tableId);
  batch.update(tableRef, {
    status: 'open',
    currentRoomId: '',
    gameCount: 0,
    playerIds: [],
    seatAssignment: {},
  });
  for (const pid of playerIds) {
    const participantRef = doc(db, COMPETITION_COLLECTION, competitionId, 'participants', pid);
    batch.update(participantRef, { status: 'idle', currentTableId: '' });
  }
  await batch.commit();
};

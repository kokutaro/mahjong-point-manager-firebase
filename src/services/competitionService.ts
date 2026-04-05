import {
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
} from 'firebase/firestore';
import type {
  Competition,
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionTable,
} from '../types';
import { db } from './firebase';

export const COMPETITION_COLLECTION = 'competitions';

// --- Competition CRUD ---

export const createCompetition = async (
  competition: Omit<Competition, 'createdAt'>,
): Promise<void> => {
  const competitionRef = doc(db, COMPETITION_COLLECTION, competition.id);
  await setDoc(competitionRef, {
    ...competition,
    createdAt: serverTimestamp(),
  });
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

// --- Passcode verification ---

export const verifyPasscode = async (
  competitionId: string,
  inputPasscode: string,
): Promise<boolean> => {
  const docRef = doc(db, COMPETITION_COLLECTION, competitionId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return false;
  const data = snapshot.data() as Competition;
  if (!data.hasPasscode || !data.passcode) return true;
  const { hashPasscode } = await import('../utils/hash');
  const inputHash = await hashPasscode(inputPasscode, competitionId);
  return inputHash === data.passcode;
};

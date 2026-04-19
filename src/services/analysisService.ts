import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { AnalysisEntry, AnalysisSource } from '../types/analysis';
import { normalizeAnalysisEntry as normalizeAnalysisDraft } from '../utils/analysis';
import { sanitizeFirestoreData } from '../utils/gameSettings';
import { db } from './firebase';

export const USER_ANALYSES_COLLECTION = 'userAnalyses';
export const ANALYSIS_ENTRIES_COLLECTION = 'entries';

const getAnalysisEntriesCollection = (uid: string) => {
  return collection(db, USER_ANALYSES_COLLECTION, uid, ANALYSIS_ENTRIES_COLLECTION);
};

const getAnalysisEntryDocument = (uid: string, entryId: string) => {
  return doc(db, USER_ANALYSES_COLLECTION, uid, ANALYSIS_ENTRIES_COLLECTION, entryId);
};

const normalizeAnalysisEntry = (
  uid: string,
  entryId: string,
  data: AnalysisEntry,
): AnalysisEntry => {
  return normalizeAnalysisDraft({
    ...data,
    id: data.id || entryId,
    uid: data.uid || uid,
  });
};

export const subscribeAnalysisEntries = (
  uid: string,
  callback: (entries: AnalysisEntry[]) => void,
): Unsubscribe => {
  const entriesQuery = query(getAnalysisEntriesCollection(uid), orderBy('updatedAt', 'desc'));

  return onSnapshot(
    entriesQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((entrySnapshot) => {
          return normalizeAnalysisEntry(
            uid,
            entrySnapshot.id,
            entrySnapshot.data() as AnalysisEntry,
          );
        }),
      );
    },
    (error) => {
      console.error('Analysis entries sync error:', error);
      callback([]);
    },
  );
};

export const getAnalysisEntry = async (
  uid: string,
  entryId: string,
): Promise<AnalysisEntry | null> => {
  const entrySnapshot = await getDoc(getAnalysisEntryDocument(uid, entryId));

  if (!entrySnapshot.exists()) {
    return null;
  }

  return normalizeAnalysisEntry(uid, entrySnapshot.id, entrySnapshot.data() as AnalysisEntry);
};

export const findAnalysisEntryByHandLog = async (
  uid: string,
  source: AnalysisSource,
): Promise<AnalysisEntry | null> => {
  return getAnalysisEntry(uid, source.handLogId);
};

export const saveAnalysisEntry = async (uid: string, entry: AnalysisEntry): Promise<void> => {
  const normalizedEntry = normalizeAnalysisDraft({
    ...entry,
    id: entry.source.handLogId,
    uid,
  });
  const sanitizedEntry = sanitizeFirestoreData({
    ...normalizedEntry,
  }) as AnalysisEntry;
  const entryId = entry.source.handLogId;

  await setDoc(
    getAnalysisEntryDocument(uid, entryId),
    {
      ...sanitizedEntry,
      hand: {
        ...sanitizedEntry.hand,
        ...(normalizedEntry.hand.winningTile ? {} : { winningTile: deleteField() }),
        ...(normalizedEntry.hand.winningTileSource ? {} : { winningTileSource: deleteField() }),
        ...(normalizedEntry.hand.waits ? {} : { waits: deleteField() }),
        wait: deleteField(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const deleteAnalysisEntry = async (uid: string, entryId: string): Promise<void> => {
  await deleteDoc(getAnalysisEntryDocument(uid, entryId));
};

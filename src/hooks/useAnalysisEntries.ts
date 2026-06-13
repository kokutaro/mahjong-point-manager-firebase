import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import type { AnalysisEntry } from '../types/analysis';
import { subscribeAnalysisEntries } from '../services/analysisService';

interface UseAnalysisEntriesResult {
  uid: string | null;
  entries: AnalysisEntry[];
  loading: boolean;
}

export const useAnalysisEntries = (): UseAnalysisEntriesResult => {
  const { authReady, uid } = useAuth();
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [entriesOwnerUid, setEntriesOwnerUid] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubscribe = subscribeAnalysisEntries(uid, (nextEntries) => {
      setEntries(nextEntries);
      setEntriesOwnerUid(uid);
    });

    return () => unsubscribe();
  }, [uid]);

  const loading = authReady && uid !== null && entriesOwnerUid !== uid;

  return {
    uid,
    entries: uid && entriesOwnerUid === uid ? entries : [],
    loading,
  };
};

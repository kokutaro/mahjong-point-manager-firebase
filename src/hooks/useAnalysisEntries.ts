import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import type { AnalysisEntry } from '../types/analysis';
import { subscribeAnalysisEntries } from '../services/analysisService';
import { auth } from '../services/firebase';

interface UseAnalysisEntriesResult {
  uid: string | null;
  entries: AnalysisEntry[];
  loading: boolean;
}

export const useAnalysisEntries = (): UseAnalysisEntriesResult => {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setEntries([]);
      setUid(user?.uid ?? null);

      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubscribe = subscribeAnalysisEntries(uid, (nextEntries) => {
      setEntries(nextEntries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return {
    uid,
    entries: uid ? entries : [],
    loading,
  };
};

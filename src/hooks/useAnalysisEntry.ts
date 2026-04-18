import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import {
  deleteAnalysisEntry as removeAnalysisEntry,
  findAnalysisEntryByHandLog,
  getAnalysisEntry,
  saveAnalysisEntry as persistAnalysisEntry,
} from '../services/analysisService';
import { auth } from '../services/firebase';
import type { AnalysisEntry, AnalysisSource } from '../types/analysis';

interface UseAnalysisEntryOptions {
  entryId?: string | null;
  source?: AnalysisSource | null;
}

interface UseAnalysisEntryResult {
  uid: string | null;
  analysisEntry: AnalysisEntry | null;
  draftAnalysisEntry: AnalysisEntry | null;
  hasDraftChanges: boolean;
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  setDraftAnalysisEntry: (entry: AnalysisEntry | null) => void;
  resetDraftAnalysisEntry: () => void;
  saveAnalysisEntry: (entry: AnalysisEntry) => Promise<void>;
  deleteAnalysisEntry: () => Promise<void>;
}

const loadAnalysisEntry = async (
  uid: string,
  entryId?: string | null,
  source?: AnalysisSource | null,
): Promise<AnalysisEntry | null> => {
  if (entryId) {
    return getAnalysisEntry(uid, entryId);
  }

  if (source) {
    return findAnalysisEntryByHandLog(uid, source);
  }

  return null;
};

const getSourceKey = (source?: AnalysisSource | null): string | null => {
  if (!source) {
    return null;
  }

  return [
    source.kind,
    source.handLogId,
    source.roomId ?? '',
    source.competitionId ?? '',
    source.gameResultId ?? '',
  ].join(':');
};

const getSourceFromKey = (sourceKey: string | null): AnalysisSource | null => {
  if (!sourceKey) {
    return null;
  }

  const [kind, handLogId, roomId, competitionId, gameResultId] = sourceKey.split(':');

  if ((kind !== 'room' && kind !== 'competition') || !handLogId) {
    return null;
  }

  return {
    kind,
    handLogId,
    ...(roomId ? { roomId } : {}),
    ...(competitionId ? { competitionId } : {}),
    ...(gameResultId ? { gameResultId } : {}),
  };
};

export const useAnalysisEntry = ({
  entryId,
  source,
}: UseAnalysisEntryOptions): UseAnalysisEntryResult => {
  const sourceKey = getSourceKey(source);
  const stableSource = useMemo(() => getSourceFromKey(sourceKey), [sourceKey]);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [analysisEntry, setAnalysisEntry] = useState<AnalysisEntry | null>(null);
  const [draftAnalysisEntry, setDraftAnalysisEntry] = useState<AnalysisEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAnalysisEntry(null);
      setDraftAnalysisEntry(null);
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
      setAnalysisEntry(null);
      setDraftAnalysisEntry(null);
      setLoading(false);
      return;
    }

    if (!entryId && !stableSource) {
      setAnalysisEntry(null);
      setDraftAnalysisEntry(null);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setAnalysisEntry(null);
    setDraftAnalysisEntry(null);
    setLoading(true);

    void loadAnalysisEntry(uid, entryId, stableSource)
      .then((entry) => {
        if (!isCancelled) {
          setAnalysisEntry(entry);
          setDraftAnalysisEntry(null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAnalysisEntry(null);
          setDraftAnalysisEntry(null);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [entryId, stableSource, uid]);

  const saveAnalysisEntry = async (entry: AnalysisEntry) => {
    if (!uid) {
      throw new Error('認証されていません');
    }

    setSaving(true);

    try {
      await persistAnalysisEntry(uid, entry);
      setAnalysisEntry({
        ...entry,
        uid,
      });
      setDraftAnalysisEntry(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteAnalysisEntry = async () => {
    if (!uid) {
      throw new Error('認証されていません');
    }

    const targetEntryId = analysisEntry?.id ?? entryId;
    if (!targetEntryId) {
      return;
    }

    setDeleting(true);

    try {
      await removeAnalysisEntry(uid, targetEntryId);
      setAnalysisEntry(null);
      setDraftAnalysisEntry(null);
    } finally {
      setDeleting(false);
    }
  };

  return {
    uid,
    analysisEntry,
    loading,
    saving,
    deleting,
    draftAnalysisEntry: draftAnalysisEntry ?? analysisEntry,
    hasDraftChanges: draftAnalysisEntry !== null,
    setDraftAnalysisEntry,
    resetDraftAnalysisEntry: () => setDraftAnalysisEntry(null),
    saveAnalysisEntry,
    deleteAnalysisEntry,
  };
};

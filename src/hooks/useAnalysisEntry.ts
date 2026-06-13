import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import {
  deleteAnalysisEntry as removeAnalysisEntry,
  findAnalysisEntryByHandLog,
  getAnalysisEntry,
  saveAnalysisEntry as persistAnalysisEntry,
} from '../services/analysisService';
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
  const targetKey = entryId ?? sourceKey;
  const stableSource = useMemo(() => getSourceFromKey(sourceKey), [sourceKey]);
  const { authReady, sessionId, uid } = useAuth();
  const [analysisEntry, setAnalysisEntry] = useState<AnalysisEntry | null>(null);
  const [draftAnalysisEntry, setDraftAnalysisEntry] = useState<AnalysisEntry | null>(null);
  const [loadedTargetKey, setLoadedTargetKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const activeTargetKey = authReady && uid && targetKey ? `${sessionId}:${uid}:${targetKey}` : null;
  const loading = !authReady
    ? Boolean(targetKey)
    : activeTargetKey !== null && loadedTargetKey !== activeTargetKey;
  const resolvedAnalysisEntry = activeTargetKey === null || loading ? null : analysisEntry;
  const resolvedDraftAnalysisEntry =
    activeTargetKey === null || loading ? null : (draftAnalysisEntry ?? resolvedAnalysisEntry);

  useEffect(() => {
    if (!uid || !activeTargetKey) {
      return;
    }

    let isCancelled = false;

    void loadAnalysisEntry(uid, entryId, stableSource)
      .then((entry) => {
        if (!isCancelled) {
          setAnalysisEntry(entry);
          setDraftAnalysisEntry(null);
          setLoadedTargetKey(activeTargetKey);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAnalysisEntry(null);
          setDraftAnalysisEntry(null);
          setLoadedTargetKey(activeTargetKey);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTargetKey, entryId, stableSource, uid]);

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
      setLoadedTargetKey(activeTargetKey);
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
      setLoadedTargetKey(activeTargetKey);
    } finally {
      setDeleting(false);
    }
  };

  return {
    uid,
    analysisEntry: resolvedAnalysisEntry,
    loading,
    saving,
    deleting,
    draftAnalysisEntry: resolvedDraftAnalysisEntry,
    hasDraftChanges: resolvedDraftAnalysisEntry !== null && draftAnalysisEntry !== null,
    setDraftAnalysisEntry,
    resetDraftAnalysisEntry: () => setDraftAnalysisEntry(null),
    saveAnalysisEntry,
    deleteAnalysisEntry,
  };
};

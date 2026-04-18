import { useMemo } from 'react';
import { useAnalysisEntry } from '../../hooks/useAnalysisEntry';
import type { HandLog, Player } from '../../types';
import type { AnalysisDetailMode } from './AnalysisDetailModal';
import { AnalysisDetailModal } from './AnalysisDetailModal';
import { Modal } from '../ui/Modal';
import { createAnalysisEntrySeed } from '../../utils/analysis';
import type { AnalysisSource } from '../../types/analysis';
import styles from './AnalysisEventModalLauncher.module.css';

const isSameSource = (left: AnalysisSource, right: AnalysisSource): boolean => {
  return (
    left.kind === right.kind &&
    left.handLogId === right.handLogId &&
    left.roomId === right.roomId &&
    left.competitionId === right.competitionId &&
    left.gameResultId === right.gameResultId
  );
};

export interface AnalysisModalSelection {
  handLog: HandLog;
  source: AnalysisSource;
  players: Pick<Player, 'id' | 'name' | 'wind'>[];
}

interface AnalysisEventModalLauncherProps {
  isOpen: boolean;
  selection: AnalysisModalSelection | null;
  initialMode?: Extract<AnalysisDetailMode, 'edit' | 'view'>;
  onClose: () => void;
}

export const AnalysisEventModalLauncher = ({
  isOpen,
  selection,
  initialMode = 'edit',
  onClose,
}: AnalysisEventModalLauncherProps) => {
  const { uid, analysisEntry, loading, saving, deleting, saveAnalysisEntry, deleteAnalysisEntry } =
    useAnalysisEntry({ source: selection?.source ?? null });

  const selectedAnalysisEntry =
    selection && analysisEntry && isSameSource(analysisEntry.source, selection.source)
      ? analysisEntry
      : null;

  const entry = useMemo(() => {
    if (!selection || !uid) {
      return null;
    }

    if (selectedAnalysisEntry) {
      return selectedAnalysisEntry;
    }

    return createAnalysisEntrySeed({
      uid,
      handLog: selection.handLog,
      playerId: uid,
      players: selection.players,
      source: selection.source,
    });
  }, [selectedAnalysisEntry, selection, uid]);

  if (!isOpen || !selection) {
    return null;
  }

  if (!entry || (loading && !selectedAnalysisEntry)) {
    return (
      <Modal isOpen onClose={onClose} title="分析メモを準備中">
        <div className={styles.loadingState}>分析メモを読み込んでいます...</div>
      </Modal>
    );
  }

  const mode: AnalysisDetailMode = selectedAnalysisEntry ? initialMode : 'create';

  return (
    <AnalysisDetailModal
      isOpen
      mode={mode}
      entry={entry}
      isSaving={saving}
      isDeleting={deleting}
      onClose={onClose}
      onSave={
        mode === 'view'
          ? undefined
          : async (nextEntry) => {
              await saveAnalysisEntry(nextEntry);
              onClose();
            }
      }
      onDelete={
        mode === 'edit'
          ? async () => {
              await deleteAnalysisEntry();
              onClose();
            }
          : undefined
      }
    />
  );
};

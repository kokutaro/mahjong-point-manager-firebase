import { useState } from 'react';
import type { AutoTableAssignmentProposal } from '../../utils/autoTableAssignment';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './AutoTableAssignmentModal.module.css';

interface AutoTableAssignmentModalProps {
  isOpen: boolean;
  proposal: AutoTableAssignmentProposal;
  onClose: () => void;
  onConfirm: (proposal: AutoTableAssignmentProposal) => Promise<boolean>;
}

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? value.toString() : value.toFixed(1);

export const AutoTableAssignmentModal = ({
  isOpen,
  proposal,
  onClose,
  onConfirm,
}: AutoTableAssignmentModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading || proposal.assignmentCount === 0) return;
    setLoading(true);
    try {
      const applied = await onConfirm(proposal);
      if (applied) onClose();
    } catch {
      // The caller owns error messaging. Keep the proposal open for retry.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={loading ? () => undefined : onClose} title="自動アサインの確認">
      <div className={styles.content}>
        <p className={styles.description}>
          累計点数と平均順位をもとにした割当案です。内容を確認してから反映してください。
        </p>

        {proposal.assignmentCount === 0 ? (
          <p className={styles.empty}>割り当て可能な参加者または空席がありません。</p>
        ) : (
          <div className={styles.tableList}>
            {proposal.tables.map((table) => (
              <section key={table.tableId} className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <strong>{table.tableName}</strong>
                  <div className={styles.badges}>
                    <span className={styles.modeBadge}>{table.mode === '3ma' ? '3麻' : '4麻'}</span>
                    <span className={styles.rankBadge}>ランク{table.rank}</span>
                  </div>
                </div>
                {table.existingParticipants.length > 0 && (
                  <div className={styles.existingPlayers}>
                    <span className={styles.groupLabel}>手動配置を維持</span>
                    {table.existingParticipants.map((participant) => (
                      <span key={participant.id} className={styles.existingPlayer}>
                        {participant.name}
                      </span>
                    ))}
                  </div>
                )}
                <span className={styles.groupLabel}>自動追加</span>
                <ol className={styles.playerList}>
                  {table.participants.map((participant) => (
                    <li key={participant.id} className={styles.playerRow}>
                      <span>{participant.name}</span>
                      <span className={styles.standing}>
                        {participant.gameCount === 0
                          ? '対局実績なし'
                          : `累計 ${formatNumber(participant.totalPoint)} / 平均順位 ${formatNumber(participant.averageRank ?? 0)}`}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}

        {proposal.unassignedParticipantIds.length > 0 && (
          <p className={styles.warning}>
            {proposal.unassignedParticipantIds.length}名は空席不足のため割り当てられません。
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || proposal.assignmentCount === 0}
          >
            {loading ? 'アサイン中...' : 'アサインする'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

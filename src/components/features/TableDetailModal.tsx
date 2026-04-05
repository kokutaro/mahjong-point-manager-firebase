import { useState } from 'react';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  assignPlayerToTable,
  deleteTableWithCleanup,
  unassignPlayerFromTable,
  updateTable,
} from '../../services/competitionService';
import type {
  CompetitionParticipant,
  CompetitionStatus,
  CompetitionTable,
  SeatAssignment,
} from '../../types';
import { randomizeSeats } from '../../utils/tableLogic';
import { Button } from '../ui/Button';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { Modal } from '../ui/Modal';
import styles from './TableDetailModal.module.css';

const WIND_LABELS: Record<string, string> = {
  East: '東',
  South: '南',
  West: '西',
  North: '北',
};

const ALL_SEATS_4MA = ['East', 'South', 'West', 'North'] as const;
const ALL_SEATS_3MA = ['East', 'South', 'West'] as const;

interface TableDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: CompetitionTable;
  participants: CompetitionParticipant[];
  competitionId: string;
  canManage: boolean;
  competitionStatus: CompetitionStatus;
}

export const TableDetailModal = ({
  isOpen,
  onClose,
  table,
  participants,
  competitionId,
  canManage,
  competitionStatus,
}: TableDetailModalProps) => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const capacity = table.mode === '3ma' ? 3 : 4;
  const allSeats = table.mode === '3ma' ? ALL_SEATS_3MA : ALL_SEATS_4MA;
  const isOpen_ = table.status === 'open';
  const isPlaying = table.status === 'playing';
  const playerMap = new Map(participants.map((p) => [p.id, p]));
  const idlePlayers = participants.filter((p) => p.status === 'idle');
  const canAssignMore = table.playerIds.length < capacity;

  const handleAssign = async () => {
    if (!selectedPlayerId || loading) return;
    setLoading(true);
    try {
      await assignPlayerToTable(competitionId, table.id, table, selectedPlayerId);
      setSelectedPlayerId('');
      showSnackbar('プレイヤーを卓に追加しました');
    } catch (error) {
      console.error('Failed to assign player:', error);
      showSnackbar('プレイヤーの追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (participantId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      await unassignPlayerFromTable(competitionId, table.id, table, participantId);
      showSnackbar('プレイヤーを卓から外しました');
    } catch (error) {
      console.error('Failed to unassign player:', error);
      showSnackbar('プレイヤーの解除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRandomizeSeats = async () => {
    if (loading || table.playerIds.length === 0) return;
    setLoading(true);
    try {
      const newSeats = randomizeSeats(table.playerIds, table.mode);
      await updateTable(competitionId, table.id, { seatAssignment: newSeats });
      showSnackbar('席順をランダムに変更しました');
    } catch (error) {
      console.error('Failed to randomize seats:', error);
      showSnackbar('席順の変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatChange = async (playerId: string, newSeat: string) => {
    if (loading) return;
    const currentAssignment = table.seatAssignment ?? {};
    // Swap: find who currently has the target seat
    const swapPlayerId = Object.entries(currentAssignment).find(
      ([, seat]) => seat === newSeat,
    )?.[0];
    const oldSeat = currentAssignment[playerId];

    const updatedAssignment: SeatAssignment = { ...currentAssignment };
    updatedAssignment[playerId] = newSeat as SeatAssignment[string];
    if (swapPlayerId && oldSeat) {
      updatedAssignment[swapPlayerId] = oldSeat;
    }

    setLoading(true);
    try {
      await updateTable(competitionId, table.id, { seatAssignment: updatedAssignment });
    } catch (error) {
      console.error('Failed to change seat:', error);
      showSnackbar('席の変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (newMode: '3ma' | '4ma') => {
    if (loading || newMode === table.mode) return;
    setLoading(true);
    try {
      await updateTable(competitionId, table.id, { mode: newMode });
      showSnackbar(`モードを${newMode === '3ma' ? '3麻' : '4麻'}に変更しました`);
    } catch (error) {
      console.error('Failed to change mode:', error);
      showSnackbar('モードの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteTableWithCleanup(competitionId, table.id, table.playerIds);
      setIsDeleteConfirmOpen(false);
      onClose();
      showSnackbar('卓を削除しました');
    } catch (error) {
      console.error('Failed to delete table:', error);
      showSnackbar('卓の削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const showManageControls =
    canManage && competitionStatus !== 'closed' && competitionStatus !== 'archived';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={table.name}>
        <div className={styles.content}>
          {/* 席順表示 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>席順</h4>
            {table.playerIds.length === 0 ? (
              <p className={styles.emptyText}>プレイヤーが割り当てられていません</p>
            ) : (
              <div className={styles.seatList}>
                {table.playerIds.map((pid) => {
                  const p = playerMap.get(pid);
                  const seat = table.seatAssignment?.[pid];
                  return (
                    <div key={pid} className={styles.seatRow}>
                      {showManageControls && !isPlaying ? (
                        <select
                          className={styles.seatSelect}
                          value={seat ?? ''}
                          onChange={(e) => handleSeatChange(pid, e.target.value)}
                          disabled={loading}
                        >
                          {allSeats.map((s) => (
                            <option key={s} value={s}>
                              {WIND_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={styles.seatLabel}>{seat ? WIND_LABELS[seat] : '—'}</span>
                      )}
                      <span className={styles.playerName}>{p?.name ?? pid}</span>
                      {showManageControls && !isPlaying && (
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={() => handleUnassign(pid)}
                          disabled={loading}
                        >
                          外す
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 席順操作 */}
          {showManageControls && !isPlaying && table.playerIds.length > 0 && (
            <div className={styles.section}>
              <Button
                size="small"
                variant="secondary"
                onClick={handleRandomizeSeats}
                disabled={loading}
              >
                ランダム配席
              </Button>
            </div>
          )}

          {/* プレイヤー追加 */}
          {showManageControls && canAssignMore && !isPlaying && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>プレイヤーを追加</h4>
              <div className={styles.assignRow}>
                <select
                  className={styles.playerSelect}
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">選択してください</option>
                  {idlePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="small"
                  variant="primary"
                  onClick={handleAssign}
                  disabled={!selectedPlayerId || loading}
                >
                  追加
                </Button>
              </div>
            </div>
          )}

          {/* モード変更 */}
          {showManageControls && isOpen_ && table.playerIds.length === 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>モード変更</h4>
              <div className={styles.modeRow}>
                <Button
                  size="small"
                  variant={table.mode === '4ma' ? 'primary' : 'secondary'}
                  onClick={() => handleModeChange('4ma')}
                  disabled={loading}
                >
                  4麻
                </Button>
                <Button
                  size="small"
                  variant={table.mode === '3ma' ? 'primary' : 'secondary'}
                  onClick={() => handleModeChange('3ma')}
                  disabled={loading}
                >
                  3麻
                </Button>
              </div>
            </div>
          )}

          {/* 削除 */}
          {showManageControls && isOpen_ && (
            <div className={styles.section}>
              <Button
                size="small"
                variant="danger"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={loading}
              >
                卓を削除
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        title="卓の削除"
        message={
          table.playerIds.length > 0
            ? 'プレイヤーをデアサインして卓を削除しますか？'
            : '卓を削除しますか？'
        }
        confirmText="削除"
        cancelText="キャンセル"
        type="danger"
      />
    </>
  );
};

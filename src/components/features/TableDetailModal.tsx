import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  assignPlayersToTable,
  deleteTableWithCleanup,
  unassignPlayerFromTable,
  updateTable,
} from '../../services/competitionService';
import type {
  CompetitionParticipant,
  CompetitionStatus,
  CompetitionTable,
  SeatAssignment,
  TableRank,
} from '../../types';
import { getTableRank, TABLE_RANKS } from '../../utils/autoTableAssignment';
import { randomizeSeats } from '../../utils/tableLogic';
import { Button } from '../ui/Button';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { Modal } from '../ui/Modal';
import { windToKanji } from '../../utils/wind';
import styles from './TableDetailModal.module.css';

const ALL_SEATS_4MA = ['East', 'South', 'West', 'North'] as const;
const ALL_SEATS_3MA = ['East', 'South', 'West'] as const;

interface SortableSeatItemProps {
  pid: string;
  name: string;
  windLabel: string;
  canDrag: boolean;
  canRemove: boolean;
  loading: boolean;
  onUnassign: (pid: string) => void;
}

const SortableSeatItem = ({
  pid,
  name,
  windLabel,
  canDrag,
  canRemove,
  loading,
  onUnassign,
}: SortableSeatItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pid,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.seatRow}>
      {canDrag && (
        <div
          {...attributes}
          {...listeners}
          className={styles.dragHandle}
          title="ドラッグして並べ替え"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
      )}
      <span className={styles.seatLabel}>{windLabel}</span>
      <span className={styles.playerName}>{name}</span>
      {canRemove && (
        <Button size="small" variant="ghost" onClick={() => onUnassign(pid)} disabled={loading}>
          外す
        </Button>
      )}
    </div>
  );
};

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const showManageControls =
    canManage && competitionStatus !== 'closed' && competitionStatus !== 'archived';

  const capacity = table.mode === '3ma' ? 3 : 4;
  const allSeats = table.mode === '3ma' ? ALL_SEATS_3MA : ALL_SEATS_4MA;
  const isOpen_ = table.status === 'open';
  const isPlaying = table.status === 'playing';
  const playerMap = new Map(participants.map((p) => [p.id, p]));
  const idlePlayers = participants.filter((p) => p.status === 'idle');
  const canAssignMore = table.playerIds.length < capacity;
  const remainingSlots = capacity - table.playerIds.length;
  const canDragReorder = showManageControls && !isPlaying;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = table.playerIds.findIndex((pid) => pid === active.id);
    const newIndex = table.playerIds.findIndex((pid) => pid === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedIds = arrayMove(table.playerIds, oldIndex, newIndex);
    const windKeys = allSeats;
    const newAssignment: SeatAssignment = {};
    reorderedIds.forEach((pid, idx) => {
      newAssignment[pid] = windKeys[idx] as SeatAssignment[string];
    });

    setLoading(true);
    try {
      await updateTable(competitionId, table.id, {
        playerIds: reorderedIds,
        seatAssignment: newAssignment,
      });
    } catch (error) {
      console.error('Failed to reorder seats:', error);
      showSnackbar('席順の変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id)
        ? prev.filter((pid) => pid !== id)
        : prev.length < remainingSlots
          ? [...prev, id]
          : prev,
    );
  };

  const handleBatchAssign = async () => {
    if (selectedPlayerIds.length === 0 || loading) return;
    setLoading(true);
    try {
      await assignPlayersToTable(competitionId, table.id, table, selectedPlayerIds);
      setSelectedPlayerIds([]);
      showSnackbar(`${selectedPlayerIds.length}人を卓に追加しました`);
    } catch (error) {
      console.error('Failed to assign players:', error);
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

  const handleRankChange = async (newRank: TableRank) => {
    if (loading || newRank === getTableRank(table)) return;
    setLoading(true);
    try {
      await updateTable(competitionId, table.id, { rank: newRank });
      showSnackbar(`卓ランクを${newRank}に変更しました`);
    } catch (error) {
      console.error('Failed to change table rank:', error);
      showSnackbar('卓ランクの変更に失敗しました');
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

  const canNavigateToMatch = table.status === 'ready' || table.status === 'playing';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={table.name}>
        <div className={styles.content}>
          {/* 対局ページへのリンク */}
          {canNavigateToMatch && (
            <div className={styles.section}>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  navigate(`/competitions/${competitionId}/tables/${table.id}`);
                }}
              >
                {table.status === 'playing' ? '対局ページを開く' : '対局ページへ'}
              </Button>
            </div>
          )}

          {/* 席順表示 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>席順</h4>
            {table.playerIds.length === 0 ? (
              <p className={styles.emptyText}>プレイヤーが割り当てられていません</p>
            ) : canDragReorder ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={table.playerIds} strategy={verticalListSortingStrategy}>
                  <div className={styles.seatList}>
                    {table.playerIds.map((pid) => {
                      const p = playerMap.get(pid);
                      const seat = table.seatAssignment?.[pid];
                      return (
                        <SortableSeatItem
                          key={pid}
                          pid={pid}
                          name={p?.name ?? pid}
                          windLabel={seat ? windToKanji(seat) : '—'}
                          canDrag
                          canRemove={showManageControls && !isPlaying}
                          loading={loading}
                          onUnassign={handleUnassign}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className={styles.seatList}>
                {table.playerIds.map((pid) => {
                  const p = playerMap.get(pid);
                  const seat = table.seatAssignment?.[pid];
                  return (
                    <div key={pid} className={styles.seatRow}>
                      <span className={styles.seatLabel}>{seat ? windToKanji(seat) : '—'}</span>
                      <span className={styles.playerName}>{p?.name ?? pid}</span>
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
              <h4 className={styles.sectionTitle}>プレイヤーを追加（残り{remainingSlots}人）</h4>
              {idlePlayers.length === 0 ? (
                <p className={styles.emptyText}>追加できるプレイヤーがいません</p>
              ) : (
                <>
                  <p className={styles.assignHint}>追加するプレイヤーをタップしてください</p>
                  <div className={styles.playerCheckList}>
                    {idlePlayers.map((p) => {
                      const isSelected = selectedPlayerIds.includes(p.id);
                      const isDisabled = !isSelected && selectedPlayerIds.length >= remainingSlots;
                      return (
                        <div
                          key={p.id}
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-disabled={isDisabled || loading}
                          tabIndex={isDisabled ? -1 : 0}
                          className={`${styles.playerCheckItem} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.checkDisabled : ''}`}
                          onClick={() => !loading && !isDisabled && togglePlayer(p.id)}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !loading && !isDisabled) {
                              e.preventDefault();
                              togglePlayer(p.id);
                            }
                          }}
                        >
                          <div className={styles.checkbox}>
                            <div
                              className={`${styles.checkInner} ${isSelected ? styles.checked : ''}`}
                            />
                          </div>
                          <span className={styles.playerName}>{p.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.assignFooter}>
                    <Button
                      size="small"
                      variant="primary"
                      onClick={handleBatchAssign}
                      disabled={selectedPlayerIds.length === 0 || loading}
                    >
                      決定（{selectedPlayerIds.length}人を追加）
                    </Button>
                  </div>
                </>
              )}
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

          {/* 卓ランク変更 */}
          {showManageControls && !isPlaying && (
            <div className={styles.section}>
              <label className={styles.rankField}>
                <span className={styles.sectionTitle}>卓ランク</span>
                <select
                  className={styles.rankSelect}
                  value={getTableRank(table)}
                  onChange={(event) => handleRankChange(Number(event.target.value) as TableRank)}
                  disabled={loading}
                >
                  {TABLE_RANKS.map((rank) => (
                    <option key={rank} value={rank}>
                      ランク{rank}
                      {rank === 1 ? '（最上位）' : ''}
                    </option>
                  ))}
                </select>
              </label>
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

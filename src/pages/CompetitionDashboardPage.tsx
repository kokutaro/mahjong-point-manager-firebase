import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AddGuestModal } from '../components/features/AddGuestModal';
import { CompetitionRuleSettings } from '../components/features/CompetitionRuleSettings';
import { CompetitionStatusBadge } from '../components/features/CompetitionStatusBadge';
import { CreateTableModal } from '../components/features/CreateTableModal';
import { ParticipantList } from '../components/features/ParticipantList';
import { ShareCompetitionModal } from '../components/features/ShareCompetitionModal';
import { TableDetailModal } from '../components/features/TableDetailModal';
import { TableList } from '../components/features/TableList';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useCompetition } from '../hooks/useCompetition';
import {
  addGuestParticipant,
  appointCoOrganizer,
  createTable,
  removeCoOrganizer,
  removeParticipant,
  updateCompetition,
} from '../services/competitionService';
import { auth } from '../services/firebase';
import type { CompetitionParticipant, CompetitionSettings, CompetitionStatus } from '../types';
import { generateId } from '../utils/id';
import styles from './CompetitionDashboardPage.module.css';

const NEXT_STATUS: Partial<Record<CompetitionStatus, CompetitionStatus>> = {
  recruiting: 'in_progress',
  in_progress: 'closed',
};

const STATUS_ACTION_LABELS: Partial<Record<CompetitionStatus, string>> = {
  recruiting: '大会を開始する',
  in_progress: '大会を終了する',
};

const STATUS_CONFIRM_MESSAGES: Partial<Record<CompetitionStatus, string>> = {
  recruiting: '大会を開始しますか？\n開始すると新たな参加者の募集は停止されます。',
  in_progress: '大会を終了しますか？\nこの操作は取り消せません。',
};

export const CompetitionDashboardPage = () => {
  const { id } = useParams<{ id: string }>();
  const { competition, participants, tables, loading } = useCompetition(id || '');
  const { showSnackbar } = useSnackbar();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [editSettings, setEditSettings] = useState<CompetitionSettings | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<CompetitionParticipant | null>(null);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const currentUserId = auth.currentUser?.uid;
  const isOrganizer = competition?.organizerId === currentUserId;
  const isCoOrganizer = competition?.coOrganizerIds.includes(currentUserId ?? '') ?? false;
  const canManage = isOrganizer || isCoOrganizer;

  const selectedTable = selectedTableId
    ? (tables.find((t) => t.id === selectedTableId) ?? null)
    : null;

  const handleStatusChange = async () => {
    if (!id || !competition) return;
    const nextStatus = NEXT_STATUS[competition.status];
    if (!nextStatus) return;

    setUpdating(true);
    try {
      const updates: Partial<{ status: CompetitionStatus; startedAt: number; closedAt: number }> = {
        status: nextStatus,
      };
      if (nextStatus === 'in_progress') {
        updates.startedAt = Date.now();
      }
      if (nextStatus === 'closed') {
        updates.closedAt = Date.now();
      }
      await updateCompetition(id, updates);
      setIsConfirmOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      showSnackbar('ステータスの更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleStartEditRules = () => {
    if (!competition) return;
    setEditSettings({ ...competition.settings });
    setIsEditingRules(true);
  };

  const handleCancelEditRules = () => {
    setIsEditingRules(false);
    setEditSettings(null);
  };

  const handleSaveRules = async () => {
    if (!id || !editSettings) return;
    setUpdating(true);
    try {
      await updateCompetition(id, { settings: editSettings });
      setIsEditingRules(false);
      setEditSettings(null);
      showSnackbar('ルール設定を保存しました');
    } catch (error) {
      console.error('Failed to save rules:', error);
      showSnackbar('ルール設定の保存に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleAppointCoOrganizer = async (participant: CompetitionParticipant) => {
    if (!id || !participant.userId) return;
    try {
      await appointCoOrganizer(id, participant.id, participant.userId);
      showSnackbar(`${participant.name} を共同主催者に任命しました`);
    } catch (error) {
      console.error('Failed to appoint co-organizer:', error);
      showSnackbar('共同主催者の任命に失敗しました');
    }
  };

  const handleRemoveCoOrganizer = async (participant: CompetitionParticipant) => {
    if (!id || !participant.userId) return;
    try {
      await removeCoOrganizer(id, participant.id, participant.userId);
      showSnackbar(`${participant.name} の共同主催者を解除しました`);
    } catch (error) {
      console.error('Failed to remove co-organizer:', error);
      showSnackbar('共同主催者の解除に失敗しました');
    }
  };

  const handleRemoveParticipant = async () => {
    if (!id || !removeTarget) return;
    try {
      if (removeTarget.role === 'co_organizer' && removeTarget.userId) {
        await removeCoOrganizer(id, removeTarget.id, removeTarget.userId);
      }
      await removeParticipant(id, removeTarget.id);
      showSnackbar(`${removeTarget.name} を削除しました`);
      setRemoveTarget(null);
    } catch (error) {
      console.error('Failed to remove participant:', error);
      showSnackbar('参加者の削除に失敗しました');
    }
  };

  const handleAddGuest = async (name: string) => {
    if (!id) return;
    try {
      await addGuestParticipant(id, name);
      showSnackbar(`ゲスト「${name}」を追加しました`);
    } catch (error) {
      console.error('Failed to add guest:', error);
      showSnackbar('ゲストの追加に失敗しました');
      throw error;
    }
  };

  const handleCreateTable = async (name: string, mode: '3ma' | '4ma') => {
    if (!id) return;
    try {
      await createTable(id, {
        id: generateId(),
        name,
        mode,
        status: 'open',
        playerIds: [],
      });
      showSnackbar(`卓「${name}」を作成しました`);
    } catch (error) {
      console.error('Failed to create table:', error);
      showSnackbar('卓の作成に失敗しました');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className={styles.container}>
        <p>大会が見つかりません</p>
        <Link to="/competitions" className={styles.backLink}>
          大会一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link to="/competitions" className={styles.backLink}>
        ← 大会一覧に戻る
      </Link>

      <div className={styles.headerRow}>
        <h1 className={styles.title}>{competition.name}</h1>
        <CompetitionStatusBadge status={competition.status} />
      </div>

      {competition.description && <p className={styles.description}>{competition.description}</p>}

      {/* 主催者・共同主催者アクション */}
      {canManage && (
        <div className={styles.section}>
          <div className={styles.actionRow}>
            <Button size="small" variant="secondary" onClick={() => setIsShareOpen(true)}>
              共有
            </Button>
            {isOrganizer && STATUS_ACTION_LABELS[competition.status] && (
              <Button
                size="small"
                variant={competition.status === 'in_progress' ? 'danger' : 'primary'}
                onClick={() => setIsConfirmOpen(true)}
                disabled={updating}
              >
                {STATUS_ACTION_LABELS[competition.status]}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 参加者 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>参加者 ({participants.length}名)</h2>
          {isOrganizer && (
            <Button size="small" variant="secondary" onClick={() => setIsGuestModalOpen(true)}>
              ゲストを追加
            </Button>
          )}
        </div>
        <ParticipantList
          participants={participants}
          currentUserId={currentUserId}
          isOrganizer={isOrganizer}
          onAppointCoOrganizer={handleAppointCoOrganizer}
          onRemoveCoOrganizer={handleRemoveCoOrganizer}
          onRemoveParticipant={(p) => setRemoveTarget(p)}
        />
      </div>

      {/* 卓一覧 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>卓一覧 ({tables.length}卓)</h2>
          {canManage && (
            <Button size="small" variant="secondary" onClick={() => setIsCreateTableOpen(true)}>
              卓を作成
            </Button>
          )}
        </div>
        <TableList
          tables={tables}
          participants={participants}
          onTableClick={(t) => setSelectedTableId(t.id)}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>ルール設定</h2>
          {isOrganizer && competition.status === 'recruiting' && !isEditingRules && (
            <Button size="small" variant="secondary" onClick={handleStartEditRules}>
              編集
            </Button>
          )}
        </div>
        {isEditingRules && editSettings ? (
          <div className={styles.editSection}>
            <CompetitionRuleSettings settings={editSettings} onChange={setEditSettings} />
            <div className={styles.editActions}>
              <Button
                size="small"
                variant="secondary"
                onClick={handleCancelEditRules}
                disabled={updating}
              >
                キャンセル
              </Button>
              <Button size="small" variant="primary" onClick={handleSaveRules} disabled={updating}>
                {updating ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.infoCard}>
            <div className={styles.ruleGrid}>
              <div>
                <div className={styles.infoLabel}>対局形式</div>
                <div className={styles.infoValue}>
                  {competition.settings.length === 'Hanchan' ? '半荘' : '東風'}
                </div>
              </div>
              <div>
                <div className={styles.infoLabel}>ウマ</div>
                <div className={styles.infoValue}>
                  {competition.settings.uma[0]}-{competition.settings.uma[1]}
                </div>
              </div>
              <div>
                <div className={styles.infoLabel}>原点 (4麻)</div>
                <div className={styles.infoValue}>
                  {competition.settings.startPoint4ma.toLocaleString()}
                </div>
              </div>
              <div>
                <div className={styles.infoLabel}>原点 (3麻)</div>
                <div className={styles.infoValue}>
                  {competition.settings.startPoint3ma.toLocaleString()}
                </div>
              </div>
              <div>
                <div className={styles.infoLabel}>返し点 (4麻)</div>
                <div className={styles.infoValue}>
                  {competition.settings.returnPoint4ma.toLocaleString()}
                </div>
              </div>
              <div>
                <div className={styles.infoLabel}>返し点 (3麻)</div>
                <div className={styles.infoValue}>
                  {competition.settings.returnPoint3ma.toLocaleString()}
                </div>
              </div>
              <div>
                <div className={styles.infoLabel}>レート</div>
                <div className={styles.infoValue}>
                  {competition.settings.rate === 0 ? 'なし' : competition.settings.rate}
                </div>
              </div>
              {competition.settings.useChip && (
                <div>
                  <div className={styles.infoLabel}>チップレート</div>
                  <div className={styles.infoValue}>{competition.settings.chipRate ?? 0}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 共有モーダル */}
      {id && (
        <ShareCompetitionModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          competitionId={id}
        />
      )}

      {/* ステータス変更確認 */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onConfirm={handleStatusChange}
        onCancel={() => setIsConfirmOpen(false)}
        title="ステータス変更"
        message={STATUS_CONFIRM_MESSAGES[competition.status] || ''}
        confirmText="はい"
        cancelText="キャンセル"
        type={competition.status === 'in_progress' ? 'danger' : 'default'}
      />

      {/* 参加者削除確認 */}
      <ConfirmationDialog
        isOpen={!!removeTarget}
        onConfirm={handleRemoveParticipant}
        onCancel={() => setRemoveTarget(null)}
        title="参加者の削除"
        message={`${removeTarget?.name ?? ''} を大会から削除しますか？`}
        confirmText="削除"
        cancelText="キャンセル"
        type="danger"
      />

      {/* ゲスト追加モーダル */}
      <AddGuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onAdd={handleAddGuest}
      />

      {/* 卓作成モーダル */}
      <CreateTableModal
        isOpen={isCreateTableOpen}
        onClose={() => setIsCreateTableOpen(false)}
        onCreateTable={handleCreateTable}
      />

      {/* 卓詳細モーダル */}
      {selectedTable && id && (
        <TableDetailModal
          isOpen={!!selectedTable}
          onClose={() => setSelectedTableId(null)}
          table={selectedTable}
          participants={participants}
          competitionId={id}
          canManage={canManage}
          competitionStatus={competition.status}
        />
      )}
    </div>
  );
};

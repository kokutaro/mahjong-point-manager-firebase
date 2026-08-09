import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AddGuestModal } from '../components/features/AddGuestModal';
import { AutoTableAssignmentModal } from '../components/features/AutoTableAssignmentModal';
import { CompetitionRuleSettings } from '../components/features/CompetitionRuleSettings';
import { CompetitionStatusBadge } from '../components/features/CompetitionStatusBadge';
import { CreateTableModal } from '../components/features/CreateTableModal';
import { ParticipantList } from '../components/features/ParticipantList';
import { ShareCompetitionModal } from '../components/features/ShareCompetitionModal';
import { TableDetailModal } from '../components/features/TableDetailModal';
import { TableList } from '../components/features/TableList';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useAuth } from '../contexts/useAuth';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useCompetition } from '../hooks/useCompetition';
import {
  addGuestParticipant,
  applyAutoTableAssignment,
  appointCoOrganizer,
  createTable,
  removeCoOrganizer,
  removeParticipant,
  updateCompetition,
} from '../services/competitionService';
import type {
  CompetitionParticipant,
  CompetitionSettings,
  CompetitionStatus,
  TableRank,
} from '../types';
import {
  areAutoTableAssignmentProposalsEqual,
  buildAutoTableAssignment,
  type AutoTableAssignmentProposal,
} from '../utils/autoTableAssignment';
import { generateId } from '../utils/id';
import { formatUmaDisplay } from '../utils/uma';
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
  recruiting: '大会を開始しますか？\n開始後も参加者の追加と共同主催者の任命・解除ができます。',
  in_progress: '大会を終了しますか？\nこの操作は取り消せません。',
};

export const CompetitionDashboardPage = () => {
  const { uid: currentUserId } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { competition, participants, tables, gameResults, loading } = useCompetition(id || '');
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
  const [autoAssignmentProposal, setAutoAssignmentProposal] =
    useState<AutoTableAssignmentProposal | null>(null);

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

  const handleCreateTable = async (name: string, mode: '3ma' | '4ma', rank: TableRank) => {
    if (!id) return;
    try {
      await createTable(id, {
        id: generateId(),
        name,
        rank,
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

  const handleOpenAutoAssignment = () => {
    setAutoAssignmentProposal(buildAutoTableAssignment(tables, participants, gameResults));
  };

  const handleConfirmAutoAssignment = async (proposal: AutoTableAssignmentProposal) => {
    if (!id) return false;

    const currentProposal = buildAutoTableAssignment(tables, participants, gameResults);
    if (!areAutoTableAssignmentProposalsEqual(proposal, currentProposal)) {
      setAutoAssignmentProposal(currentProposal);
      showSnackbar('大会の状況が変わったため、割当案を更新しました。もう一度確認してください');
      return false;
    }

    try {
      await applyAutoTableAssignment(id, proposal);
      showSnackbar(`${proposal.assignmentCount}人を自動アサインしました`);
      return true;
    } catch (error) {
      console.error('Failed to apply auto assignment:', error);
      showSnackbar('自動アサインに失敗しました。割当案を作り直してください');
      setAutoAssignmentProposal(buildAutoTableAssignment(tables, participants, gameResults));
      return false;
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
            <Link to={`/competitions/${id}/live`}>
              <Button size="small" variant="secondary">
                ライブビュー
              </Button>
            </Link>
            <Button size="small" variant="secondary" onClick={() => setIsShareOpen(true)}>
              共有
            </Button>
            {(competition.status === 'in_progress' ||
              competition.status === 'closed' ||
              competition.status === 'archived') && (
              <Link to={`/competitions/${id}/report`}>
                <Button size="small" variant="secondary">
                  レポート
                </Button>
              </Link>
            )}
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
          currentUserId={currentUserId ?? undefined}
          competitionStatus={competition.status}
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
            <div className={styles.tableActions}>
              {competition.status !== 'closed' && competition.status !== 'archived' && (
                <Button size="small" variant="primary" onClick={handleOpenAutoAssignment}>
                  自動アサイン
                </Button>
              )}
              <Button size="small" variant="secondary" onClick={() => setIsCreateTableOpen(true)}>
                卓を作成
              </Button>
            </div>
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
                <div className={styles.infoValue}>{formatUmaDisplay(competition.settings.uma)}</div>
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

      {autoAssignmentProposal && (
        <AutoTableAssignmentModal
          isOpen
          proposal={autoAssignmentProposal}
          onClose={() => setAutoAssignmentProposal(null)}
          onConfirm={handleConfirmAutoAssignment}
        />
      )}

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

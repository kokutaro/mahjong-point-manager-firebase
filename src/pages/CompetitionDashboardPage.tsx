import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompetitionStatusBadge } from '../components/features/CompetitionStatusBadge';
import { ShareCompetitionModal } from '../components/features/ShareCompetitionModal';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useCompetition } from '../hooks/useCompetition';
import { updateCompetition } from '../services/competitionService';
import { auth } from '../services/firebase';
import type { CompetitionStatus } from '../types';
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
  const { competition, participants, loading } = useCompetition(id || '');
  const { showSnackbar } = useSnackbar();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const currentUserId = auth.currentUser?.uid;
  const isOrganizer = competition?.organizerId === currentUserId;

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

      {/* 主催者アクション */}
      {isOrganizer && (
        <div className={styles.section}>
          <div className={styles.actionRow}>
            <Button size="small" variant="secondary" onClick={() => setIsShareOpen(true)}>
              共有
            </Button>
            {STATUS_ACTION_LABELS[competition.status] && (
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

      {/* 大会情報 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>参加者</h2>
        <div className={styles.infoCard}>
          <div className={styles.participantCount}>{participants.length}名が参加中</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>ルール設定</h2>
        <div className={styles.infoCard}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-s)' }}>
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
          </div>
        </div>
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
    </div>
  );
};

import { Button } from '../ui/Button';
import type { CompetitionParticipant } from '../../types';
import styles from './ParticipantList.module.css';

interface ParticipantListProps {
  participants: CompetitionParticipant[];
  currentUserId?: string;
  isOrganizer: boolean;
  onAppointCoOrganizer?: (participant: CompetitionParticipant) => void;
  onRemoveCoOrganizer?: (participant: CompetitionParticipant) => void;
  onRemoveParticipant?: (participant: CompetitionParticipant) => void;
}

const ROLE_ORDER: Record<string, number> = {
  organizer: 0,
  co_organizer: 1,
  player: 2,
};

const ROLE_LABELS: Partial<Record<string, string>> = {
  organizer: '主催者',
  co_organizer: '共同主催者',
};

const STATUS_LABELS: Record<string, string> = {
  idle: '待機中',
  assigned: '配席済み',
  playing: '対局中',
};

const sortParticipants = (
  participants: readonly CompetitionParticipant[],
): CompetitionParticipant[] =>
  [...participants].sort((a, b) => {
    const roleDiff = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
    if (roleDiff !== 0) return roleDiff;
    return (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
  });

const formatParticipantName = (participant: CompetitionParticipant): string =>
  participant.role === 'organizer' ? `${participant.name}(主催者)` : participant.name;

export const ParticipantList = ({
  participants,
  currentUserId,
  isOrganizer,
  onAppointCoOrganizer,
  onRemoveCoOrganizer,
  onRemoveParticipant,
}: ParticipantListProps) => {
  const sorted = sortParticipants(participants);

  if (sorted.length === 0) {
    return <div className={styles.empty}>参加者がいません</div>;
  }

  return (
    <div className={styles.list}>
      {sorted.map((p) => {
        const roleLabel = ROLE_LABELS[p.role];
        const statusLabel = STATUS_LABELS[p.status] ?? p.status;
        const isSelf = p.userId === currentUserId || p.id === currentUserId;

        const canAppoint = isOrganizer && !p.isGuest && p.userId && p.role === 'player' && !isSelf;
        const canDemote = isOrganizer && p.role === 'co_organizer';
        const canRemove = isOrganizer && p.role !== 'organizer' && !isSelf;

        return (
          <div key={p.id} className={styles.item}>
            <div className={styles.info}>
              <div className={styles.name}>
                {formatParticipantName(p)}
                {p.isGuest && <span className={styles.guestLabel}>(ゲスト)</span>}
              </div>
              <div className={styles.meta}>
                {roleLabel && <span className={styles.roleBadge}>{roleLabel}</span>}
                <span className={styles.statusBadge}>{statusLabel}</span>
              </div>
            </div>
            {isOrganizer && (
              <div className={styles.actions}>
                {canAppoint && onAppointCoOrganizer && (
                  <Button size="small" variant="secondary" onClick={() => onAppointCoOrganizer(p)}>
                    共同主催者に任命
                  </Button>
                )}
                {canDemote && onRemoveCoOrganizer && (
                  <Button size="small" variant="secondary" onClick={() => onRemoveCoOrganizer(p)}>
                    解除
                  </Button>
                )}
                {canRemove && onRemoveParticipant && (
                  <Button size="small" variant="danger" onClick={() => onRemoveParticipant(p)}>
                    削除
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

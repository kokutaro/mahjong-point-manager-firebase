import type { CompetitionParticipant, CompetitionTable } from '../../types';
import { windToKanji } from '../../utils/wind';
import styles from './TableCard.module.css';

const STATUS_LABELS: Record<string, string> = {
  open: '空席あり',
  ready: '準備完了',
  playing: '対局中',
  finished: '終了',
};

interface TableCardProps {
  table: CompetitionTable;
  participants: CompetitionParticipant[];
  onClick: () => void;
}

export const TableCard = ({ table, participants, onClick }: TableCardProps) => {
  const capacity = table.mode === '3ma' ? 3 : 4;
  const playerMap = new Map(participants.map((p) => [p.id, p]));

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <span className={styles.name}>{table.name}</span>
        <div className={styles.badges}>
          <span className={styles.modeBadge}>{table.mode === '3ma' ? '3麻' : '4麻'}</span>
          <span className={`${styles.statusBadge} ${styles[table.status]}`}>
            {STATUS_LABELS[table.status]}
          </span>
        </div>
      </div>
      <div className={styles.players}>
        {table.playerIds.map((pid) => {
          const p = playerMap.get(pid);
          const seat = table.seatAssignment?.[pid];
          return (
            <span key={pid} className={styles.player}>
              {seat ? `${windToKanji(seat)} ` : ''}
              {p?.name ?? pid}
            </span>
          );
        })}
        {Array.from({ length: capacity - table.playerIds.length }).map((_, i) => (
          <span key={`empty-${i}`} className={styles.emptySeat}>
            空席
          </span>
        ))}
      </div>
    </button>
  );
};

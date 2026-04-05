import type { CompetitionStatus } from '../../types';
import styles from './CompetitionStatusBadge.module.css';

const STATUS_LABELS: Record<CompetitionStatus, string> = {
  recruiting: '募集中',
  in_progress: '進行中',
  closed: '終了',
  archived: 'アーカイブ',
};

interface Props {
  status: CompetitionStatus;
}

export const CompetitionStatusBadge = ({ status }: Props) => {
  return <span className={`${styles.badge} ${styles[status]}`}>{STATUS_LABELS[status]}</span>;
};

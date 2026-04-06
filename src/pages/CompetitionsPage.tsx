import { Link, useNavigate } from 'react-router-dom';
import { CompetitionStatusBadge } from '../components/features/CompetitionStatusBadge';
import { Button } from '../components/ui/Button';
import { useCompetitions } from '../hooks/useCompetitions';
import styles from './CompetitionsPage.module.css';

const formatTimestamp = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'number') return new Date(value).toLocaleDateString('ja-JP');
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return new Date((value as { toMillis: () => number }).toMillis()).toLocaleDateString('ja-JP');
  }
  return '';
};

export const CompetitionsPage = () => {
  const navigate = useNavigate();
  const { competitions, loading } = useCompetitions();

  if (loading) {
    return (
      <div className={styles.container}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.backLink}>
        ← トップに戻る
      </Link>
      <div className={styles.header}>
        <h1 className={styles.title}>大会一覧</h1>
        <Button onClick={() => navigate('/competitions/new')} size="small">
          大会を作成
        </Button>
      </div>

      {competitions.length === 0 ? (
        <div className={styles.empty}>
          <p>大会がまだありません</p>
          <Button onClick={() => navigate('/competitions/new')}>大会を作成する</Button>
        </div>
      ) : (
        <div className={styles.list}>
          {competitions.map((comp) => (
            <div
              key={comp.id}
              className={styles.card}
              onClick={() => navigate(`/competitions/${comp.id}`)}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.cardName}>{comp.name}</h3>
                <CompetitionStatusBadge status={comp.status} />
              </div>
              <div className={styles.cardDate}>{formatTimestamp(comp.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useCompetitionSeriesList } from '../hooks/useCompetitionSeriesList';
import styles from './CompetitionSeriesListPage.module.css';

export const CompetitionSeriesListPage = () => {
  const { series, loading } = useCompetitionSeriesList();
  if (loading) return <div className={styles.container}>読み込み中...</div>;

  return (
    <main className={styles.container}>
      <Link to="/competitions" className={styles.backLink}>
        ← 大会一覧に戻る
      </Link>
      <div className={styles.header}>
        <h1 className={styles.title}>大会シリーズ</h1>
        <Link to="/competition-series/new">
          <Button size="small">シリーズを作成</Button>
        </Link>
      </div>
      {series.length === 0 ? (
        <div className={styles.empty}>大会シリーズがまだありません</div>
      ) : (
        <div className={styles.list}>
          {series.map((item) => (
            <Link key={item.id} className={styles.card} to={`/competition-series/${item.id}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{item.name}</h2>
              </div>
              <div className={styles.period}>
                {item.startDate ?? '開始日未設定'} 〜 {item.endDate ?? '終了日未設定'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
};

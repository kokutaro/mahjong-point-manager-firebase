import { Skeleton } from '../ui/Skeleton';
import styles from './DashboardSkeleton.module.css';

export const DashboardSkeleton = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton width={200} height={32} borderRadius={4} />
        <Skeleton width={96} height={40} borderRadius={8} />
      </div>

      <div className={styles.metricsGrid}>
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className={styles.metricCard}>
            <Skeleton width={64} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width={80} height={24} borderRadius={4} />
          </div>
        ))}
      </div>

      <div className={styles.chartSection}>
        <Skeleton width={256} height={24} borderRadius={4} style={{ marginBottom: 24 }} />
        <Skeleton width="100%" borderRadius={8} className={styles.chartBody} />
      </div>
    </div>
  );
};

import { Skeleton } from '../ui/Skeleton';
import styles from './HistorySkeleton.module.css';

export const HistorySkeleton = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton width={120} height={32} borderRadius={4} />
        <Skeleton width={80} height={32} borderRadius={4} />
      </div>

      <div className={styles.roomList}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={styles.roomCard}>
            <div className={styles.rowBetween}>
              <Skeleton width={80} height={20} borderRadius={4} />
              <Skeleton width={100} height={16} borderRadius={4} />
            </div>
            {index % 2 === 0 && (
              <Skeleton width="56%" height={18} borderRadius={4} className={styles.roomName} />
            )}
            <Skeleton width="88%" height={16} borderRadius={4} className={styles.playerLine} />
            <div className={styles.footer}>
              <Skeleton width={60} height={20} borderRadius={4} />
              <Skeleton width={60} height={32} borderRadius={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

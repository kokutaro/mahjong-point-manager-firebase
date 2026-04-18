import { Skeleton } from '../ui/Skeleton';
import styles from './TopPageSkeleton.module.css';

export const TopPageSkeleton = () => {
  return (
    <div className={styles.container}>
      <div className={styles.authArea}>
        <div className={styles.authUserRow}>
          <Skeleton width={168} height={14} borderRadius={6} />
          <Skeleton width={88} height={32} borderRadius={8} />
        </div>
        <Skeleton width={140} height={32} borderRadius={8} className={styles.authAnonymous} />
      </div>

      <Skeleton width={220} height={42} borderRadius={8} />

      <div className={styles.mainActions}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} height={40} borderRadius={8} className={styles.mainActionButton} />
        ))}
      </div>

      <div className={styles.joinRoom}>
        <Skeleton height={40} borderRadius={8} className={styles.roomInput} />
        <Skeleton width={72} height={40} borderRadius={8} />
      </div>
    </div>
  );
};

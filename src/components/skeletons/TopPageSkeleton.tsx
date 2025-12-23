import { Skeleton } from '../ui/Skeleton';

export const TopPageSkeleton = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        alignItems: 'center',
        marginTop: '100px',
      }}
    >
      {/* Title */}
      <Skeleton width={200} height={40} borderRadius={8} />

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <Skeleton width={100} height={40} borderRadius={8} />
        <Skeleton width={100} height={40} borderRadius={8} />
        <Skeleton width={140} height={40} borderRadius={8} />
      </div>

      {/* Join Room Section */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '32px' }}>
        <Skeleton width={200} height={40} borderRadius={8} />
        <Skeleton width={60} height={40} borderRadius={8} />
      </div>
    </div>
  );
};

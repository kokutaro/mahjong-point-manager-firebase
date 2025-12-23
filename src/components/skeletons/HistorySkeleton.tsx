import { Skeleton } from '../ui/Skeleton';

export const HistorySkeleton = () => {
  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <Skeleton width={120} height={32} borderRadius={4} />
        <Skeleton width={80} height={32} borderRadius={4} />
      </div>

      {/* Room List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Skeleton width={80} height={20} borderRadius={4} />
              <Skeleton width={100} height={16} borderRadius={4} />
            </div>
            <Skeleton width="80%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Skeleton width={60} height={20} borderRadius={4} />
              <Skeleton width={60} height={32} borderRadius={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

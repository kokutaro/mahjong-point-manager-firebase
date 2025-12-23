import { Skeleton } from '../ui/Skeleton';

export const DashboardSkeleton = () => {
  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <Skeleton width={200} height={32} borderRadius={4} />
        <Skeleton width={100} height={40} borderRadius={8} />
      </div>

      {/* Helper for Metric Card */}
      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-bg-card)', // Match card bg
              padding: '16px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              height: '84px', // Approximate height of content
            }}
          >
            <Skeleton width={60} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton width={80} height={24} borderRadius={4} />
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '24px',
          borderRadius: '12px',
          height: '300px',
        }}
      >
        <Skeleton width={250} height={24} borderRadius={4} style={{ marginBottom: 24 }} />
        <Skeleton width="100%" height={200} borderRadius={8} />
      </div>
    </div>
  );
};

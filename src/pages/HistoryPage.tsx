import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HistorySkeleton } from '../components/skeletons/HistorySkeleton';
import { Button } from '../components/ui/Button';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useRoomHistory } from '../hooks/useRoomHistory';
import { canResumeRoomFromHistory } from '../utils/historyRoomStatus';

export const HistoryPage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { rooms, loading, error } = useRoomHistory();

  useEffect(() => {
    if (!error) {
      return;
    }

    console.error(error);
    showSnackbar('Failed to load history');
  }, [error, showSnackbar]);

  if (loading) return <HistorySkeleton />;

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h2>対戦履歴</h2>
        <Button size="small" variant="secondary" onClick={() => navigate('/')}>
          トップへ
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', marginTop: '40px' }}>
          履歴はありません
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rooms.map((room) => {
            const canResume = canResumeRoomFromHistory(room);

            return (
              <div
                key={room.id}
                onClick={() => navigate(`/history/${room.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <span style={{ fontWeight: 'bold' }}>
                    {room.settings.mode === '3ma' ? '3人打ち' : '4人打ち'}
                  </span>
                  <span style={{ color: '#888', fontSize: '0.9em' }}>
                    {room.createdAt
                      ? (() => {
                          const seconds =
                            typeof room.createdAt === 'number'
                              ? room.createdAt / 1000
                              : (room.createdAt as { seconds: number }).seconds;
                          const date = new Date(seconds * 1000);
                          return `${date.getFullYear()}/${
                            date.getMonth() + 1
                          }/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date
                            .getMinutes()
                            .toString()
                            .padStart(2, '0')}`;
                        })()
                      : ''}
                  </span>
                </div>
                {room.roomName && (
                  <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '1.1em' }}>
                    {room.roomName}
                  </div>
                )}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
                >
                  <div style={{ fontSize: '0.9em', color: '#ccc' }}>
                    {room.players.map((p) => p.name).join(', ')}
                  </div>
                  <span style={{ color: '#888', fontSize: '0.9em' }}>ID: {room.id}</span>
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.8em', color: canResume ? '#4caf50' : '#aaa' }}>
                    {canResume ? '対局中/中断' : '終了済み'}
                  </span>
                  {canResume && (
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent navigating to detail
                        navigate(`/room/${room.id}`);
                      }}
                    >
                      再開
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HistorySkeleton } from '../components/skeletons/HistorySkeleton';
import { Button } from '../components/ui/Button';
import { useSnackbar } from '../contexts/SnackbarContext';
import { auth } from '../services/firebase';
import { getUserRoomHistory } from '../services/roomService';
import type { RoomState } from '../types';

export const HistoryPage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const history = await getUserRoomHistory(user.uid);
        // Sort by likely recency (if we had timestamp, but we'll trust generic order for MVP or simple reverse)
        // Actually history return from roomService is just array.
        // We'll reverse it assuming append order or just display as is.
        setRooms(history);
      } catch (err) {
        console.error(err);
        showSnackbar('Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [showSnackbar]);

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
          {rooms.map((room) => (
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
                <span style={{ color: '#888', fontSize: '0.9em' }}>ID: {room.id}</span>
              </div>
              <div style={{ fontSize: '0.9em', color: '#ccc' }}>
                {room.players.map((p) => p.name).join(', ')}
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
                <span
                  style={{ fontSize: '0.8em', color: room.status === 'ended' ? '#aaa' : '#4caf50' }}
                >
                  {room.status === 'ended' ? '終了済み' : '対局中/中断'}
                </span>
                {room.status !== 'ended' && (
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
          ))}
        </div>
      )}
    </div>
  );
};

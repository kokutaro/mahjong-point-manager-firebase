import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SessionHistoryTable } from '../components/features/SessionHistoryTable';
import { Button } from '../components/ui/Button';
import { subscribeToRoom } from '../services/roomService';
import type { RoomState } from '../types';

export const SessionDetailPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, (data) => {
        setRoom(data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!room) return <div style={{ padding: 20 }}>Room not found.</div>;

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button variant="secondary" size="small" onClick={() => navigate('/history')}>
          &lt; 戻る
        </Button>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>対局詳細</h2>

      {/* Reuse SessionHistoryTable for game-by-game breakdown */}
      <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '12px' }}>スコア推移</h3>
      <div style={{ marginBottom: '32px' }}>
          <SessionHistoryTable room={room} />
      </div>

      {/* Reuse ResultView for Final Totals reuse if convenient, or just simple table */}
      {/* ResultView has "Next Match" etc which we don't want here? ResultView handles "ended" properly now? */}
      {/* Yes, ResultView has logic for "ended" to hide buttons. 
          But room might not be explicitly "ended" if just left. 
          If we force ResultView to treat it as "ended" or just pass dummy handlers?
          ResultView checks `room.status === 'ended'`.
          If the historical room is 'ended', it works. If 'finished', it might show buttons?
          Ideally we want a read-only view regardless.
          Let's just use ResultView but maybe wrap or ensure room status logic.
          Actually, SessionHistoryTable + a simple total summary is enough as per request "Show score of each game".
          The request says: "Each session, show scores of each game (similar to in-game history)".
          ResultView shows "Total Result" + "Last Game Result".
          SessionHistoryTable shows the table of all games. This seems to match the request best.
      */}
      
    </div>
  );
};

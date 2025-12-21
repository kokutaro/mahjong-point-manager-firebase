import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { Button } from '../components/ui/Button';
import { useSnackbar } from '../contexts/SnackbarContext';
import { auth } from '../services/firebase';
import { createRoom } from '../services/roomService';
import type { GameSettings, Player } from '../types';
import { generateId } from '../utils/id';

export const TopPage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async (settings: GameSettings, hostName: string, otherPlayerNames?: string[]) => {
    setLoading(true);
    const roomId = generateId(6).toUpperCase();
    
    // Ensure we have a player ID to register as host
    const user = auth.currentUser;
    if (!user) {
        showSnackbar("認証エラーが発生しました。リロードしてください。", { position: 'top' });
        setLoading(false);
        return;
    }
    const myId = user.uid;

    const initialHostPlayer: Player = {
        id: myId,
        name: hostName,
        score: settings.startPoint,
        wind: 'East',
        isRiichi: false,
        chip: 0
    };

    const initialPlayers = [initialHostPlayer];

    if (settings.isSingleMode && otherPlayerNames) {
        otherPlayerNames.forEach((name, index) => {
            initialPlayers.push({
                id: generateId(8), // Virtual ID
                name: name,
                score: settings.startPoint,
                wind: ['South', 'West', 'North'][index] as 'South' | 'West' | 'North', // Simple initial assignment, will be reordered/shuffled mostly
                isRiichi: false,
                chip: 0
            });
        });
    }

    try {
      await createRoom(roomId, initialPlayers, settings);
      navigate(`/room/${roomId}`);
    } catch (e) {
      console.error(e);
      showSnackbar('部屋の作成に失敗しました');
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (roomIdInput) {
      navigate(`/room/${roomIdInput.toUpperCase()}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', marginTop: '100px' }}>
      <h1>麻雀点数管理</h1>
      
      <div style={{ display: 'flex', gap: '16px' }}>
        <Button onClick={() => setIsModalOpen(true)} disabled={loading}>
          部屋作成
        </Button>
        <Button onClick={() => navigate('/history')} variant="secondary">
          対戦履歴
        </Button>
        <Button onClick={() => navigate('/dashboard')} variant="secondary">
          ダッシュボード
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '32px' }}>
        <input 
          type="text" 
          placeholder="部屋ID" 
          value={roomIdInput}
          onChange={e => setRoomIdInput(e.target.value)}
          style={{ padding: '8px', fontSize: '16px', textTransform: 'uppercase' }}
        />
        <Button variant="secondary" onClick={handleJoin} disabled={!roomIdInput}>
          入室
        </Button>
      </div>

      <CreateRoomModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreateRoom}
        loading={loading}
      />
    </div>
  );
};

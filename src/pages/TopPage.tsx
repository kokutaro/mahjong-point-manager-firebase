import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { Button } from '../components/ui/Button';
import { createRoom } from '../services/roomService';
import type { GameSettings } from '../types';
import { generateId } from '../utils/id';

export const TopPage = () => {
  const navigate = useNavigate();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async (settings: GameSettings) => {
    setLoading(true);
    const roomId = generateId(6).toUpperCase();
    try {
      await createRoom(roomId, settings);
      navigate(`/room/${roomId}`);
    } catch (e) {
      console.error(e);
      alert('部屋の作成に失敗しました');
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

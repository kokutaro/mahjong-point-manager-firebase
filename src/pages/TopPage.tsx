import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { AuthModal } from '../components/features/AuthModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSnackbar } from '../contexts/SnackbarContext';
import { auth } from '../services/firebase';
import { checkRoomExists, createRoom } from '../services/roomService';
import type { GameSettings, Player } from '../types';
import { generateId } from '../utils/id';

export const TopPage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateRoom = async (
    settings: GameSettings,
    hostName: string,
    otherPlayerNames?: string[],
    roomName?: string,
  ) => {
    setLoading(true);
    const roomId = generateId(6).toUpperCase();

    // Ensure we have a player ID to register as host
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showSnackbar('認証エラーが発生しました。リロードしてください。', { position: 'top' });
      setLoading(false);
      return;
    }
    const myId = currentUser.uid;

    const initialHostPlayer: Player = {
      id: myId,
      name: hostName,
      score: settings.startPoint,
      wind: 'East',
      isRiichi: false,
      chip: 0,
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
          chip: 0,
        });
      });
    }

    try {
      await createRoom(roomId, initialPlayers, settings, roomName);
      navigate(`/room/${roomId}`);
    } catch (e) {
      console.error(e);
      showSnackbar('部屋の作成に失敗しました');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (roomIdInput) {
      setLoading(true);
      try {
        const exists = await checkRoomExists(roomIdInput.toUpperCase());
        if (exists) {
          navigate(`/room/${roomIdInput.toUpperCase()}`);
        } else {
          showSnackbar('指定した部屋は存在しません', { position: 'top' });
        }
      } catch (error) {
        console.error('Error checking room:', error);
        showSnackbar('エラーが発生しました', { position: 'top' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.reload();
    } catch (e) {
      console.error(e);
      showSnackbar('ログアウトに失敗しました');
    }
  };

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
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        {user && user.isAnonymous ? (
          <Button variant="secondary" onClick={() => setIsAuthModalOpen(true)} size="small">
            データ引き継ぎ・登録
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{user?.email}</span>
            <Button variant="secondary" onClick={handleLogout} size="small">
              ログアウト
            </Button>
          </div>
        )}
      </div>

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
        <Input
          type="text"
          placeholder="部屋ID"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
          style={{ fontSize: '16px', textTransform: 'uppercase' }}
        />
        <Button variant="secondary" onClick={handleJoin} disabled={!roomIdInput || loading}>
          入室
        </Button>
      </div>

      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateRoom}
        loading={loading}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

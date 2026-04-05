import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CompetitionStatusBadge } from '../components/features/CompetitionStatusBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  addParticipant,
  subscribeToCompetition,
  verifyPasscode,
} from '../services/competitionService';
import { auth } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Competition } from '../types';

export const CompetitionJoinPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('mahjong_player_name') || '',
  );

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToCompetition(id, (data) => {
      setCompetition(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleJoin = async () => {
    if (!id || !competition) return;
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showSnackbar('認証エラーが発生しました。リロードしてください。', { position: 'top' });
      return;
    }

    if (!playerName.trim()) {
      showSnackbar('名前を入力してください', { position: 'top' });
      return;
    }

    setJoining(true);
    try {
      if (competition.hasPasscode) {
        const valid = await verifyPasscode(id, passcodeInput);
        if (!valid) {
          showSnackbar('パスコードが正しくありません', { position: 'top' });
          setJoining(false);
          return;
        }
      }

      // Check if already a participant
      const participantRef = doc(db, 'competitions', id, 'participants', currentUser.uid);
      const existingDoc = await getDoc(participantRef);
      if (existingDoc.exists()) {
        navigate(`/competitions/${id}`);
        return;
      }

      localStorage.setItem('mahjong_player_name', playerName.trim());

      await addParticipant(id, {
        id: currentUser.uid,
        userId: currentUser.uid,
        name: playerName.trim(),
        isGuest: currentUser.isAnonymous,
        status: 'idle',
        role: 'player',
      });

      navigate(`/competitions/${id}`);
    } catch (error) {
      console.error('Failed to join competition:', error);
      showSnackbar('参加に失敗しました');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-m)', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!competition) {
    return (
      <div style={{ padding: 'var(--spacing-m)', textAlign: 'center' }}>
        <p>大会が見つかりません</p>
        <Button onClick={() => navigate('/')}>トップに戻る</Button>
      </div>
    );
  }

  if (competition.status !== 'recruiting') {
    return (
      <div style={{ padding: 'var(--spacing-m)', textAlign: 'center' }}>
        <h2>{competition.name}</h2>
        <CompetitionStatusBadge status={competition.status} />
        <p style={{ marginTop: 'var(--spacing-m)', color: 'var(--color-text-secondary)' }}>
          この大会は現在参加を受け付けていません
        </p>
        <Button onClick={() => navigate(`/competitions/${id}`)}>大会ページへ</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-m)', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-s)' }}>
        {competition.name}
      </h1>
      {competition.description && (
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-l)',
            fontSize: 'var(--font-size-s)',
          }}
        >
          {competition.description}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: 'var(--spacing-xs)',
              fontWeight: 'bold',
            }}
          >
            あなたの名前
          </label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="表示名を入力"
            fullWidth
          />
        </div>

        {competition.hasPasscode && (
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: 'var(--spacing-xs)',
                fontWeight: 'bold',
              }}
            >
              パスコード
            </label>
            <Input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="パスコードを入力"
              fullWidth
            />
          </div>
        )}

        <Button
          variant="primary"
          onClick={handleJoin}
          disabled={joining || !playerName.trim()}
          fullWidth
        >
          {joining ? '参加中...' : '大会に参加する'}
        </Button>
      </div>
    </div>
  );
};

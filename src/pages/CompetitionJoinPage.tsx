import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CompetitionStatusBadge } from '../components/features/CompetitionStatusBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/useAuth';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  addParticipant,
  getParticipant,
  subscribeToCompetition,
  verifyPasscode,
} from '../services/competitionService';
import type { Competition } from '../types';

export const CompetitionJoinPage = () => {
  const { currentUser } = useAuth();
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
  const [isPlayerNameComposing, setIsPlayerNameComposing] = useState(false);
  const [isPasscodeFieldActive, setIsPasscodeFieldActive] = useState(false);
  const passcodeInputRef = useRef<HTMLInputElement>(null);

  const normalizedPlayerName = playerName.trim();

  const activatePasscodeField = () => {
    if (passcodeInputRef.current?.readOnly) {
      passcodeInputRef.current.readOnly = false;
    }

    setIsPasscodeFieldActive(true);
  };

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
    if (!currentUser) {
      showSnackbar('認証エラーが発生しました。リロードしてください。', { position: 'top' });
      return;
    }

    if (!normalizedPlayerName) {
      showSnackbar('名前を入力してください', { position: 'top' });
      return;
    }

    if (isPlayerNameComposing) {
      showSnackbar('名前の入力を確定してから参加してください', { position: 'top' });
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
      const existing = await getParticipant(id, currentUser.uid);
      if (existing) {
        navigate(`/competitions/${id}`);
        return;
      }

      localStorage.setItem('mahjong_player_name', normalizedPlayerName);

      await addParticipant(id, {
        id: currentUser.uid,
        userId: currentUser.uid,
        name: normalizedPlayerName,
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

  if (competition.status !== 'recruiting' && competition.status !== 'in_progress') {
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
            onCompositionStart={() => setIsPlayerNameComposing(true)}
            onCompositionEnd={() => setIsPlayerNameComposing(false)}
            placeholder="表示名を入力"
            name="joinAliasInput"
            autoComplete="section-competition nickname"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
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
              ref={passcodeInputRef}
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              onFocus={activatePasscodeField}
              onTouchStart={activatePasscodeField}
              onMouseDown={activatePasscodeField}
              placeholder="パスコードを入力"
              name="competitionSecretInput"
              autoComplete="section-competition new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              readOnly={!isPasscodeFieldActive}
              fullWidth
            />
          </div>
        )}

        <Button
          variant="primary"
          onClick={handleJoin}
          disabled={joining || isPlayerNameComposing || !normalizedPlayerName}
          fullWidth
        >
          {joining ? '参加中...' : '大会に参加する'}
        </Button>
      </div>
    </div>
  );
};

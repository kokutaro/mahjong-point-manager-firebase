import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/useAuth';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  getCompetitionSeriesMemberByUserId,
  joinCompetitionSeries,
  subscribeToCompetitionSeries,
} from '../services/competitionSeriesService';
import type { CompetitionSeries } from '../types';
import { readStoredPlayerName, writeStoredPlayerName } from '../utils/userSettings';
import styles from './CompetitionSeriesJoinPage.module.css';

export const CompetitionSeriesJoinPage = () => {
  const { seriesId = '' } = useParams<{ seriesId: string }>();
  const { currentUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [series, setSeries] = useState<CompetitionSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [playerName, setPlayerName] = useState(readStoredPlayerName);
  const [isComposing, setIsComposing] = useState(false);
  const normalizedPlayerName = playerName.trim();

  useEffect(() => {
    if (!seriesId) return;
    return subscribeToCompetitionSeries(seriesId, (value) => {
      setSeries(value);
      setLoading(false);
    });
  }, [seriesId]);

  const handleJoin = async () => {
    if (!series || !currentUser || !normalizedPlayerName || isComposing) return;
    setJoining(true);
    try {
      const existing = await getCompetitionSeriesMemberByUserId(seriesId, currentUser.uid);
      if (!existing) {
        writeStoredPlayerName(normalizedPlayerName);
        await joinCompetitionSeries(seriesId, normalizedPlayerName);
      }
      navigate(`/competition-series/${seriesId}`);
    } catch (error) {
      console.error('Failed to join competition series:', error);
      showSnackbar(error instanceof Error ? error.message : '大会シリーズへの参加に失敗しました');
      setJoining(false);
    }
  };

  if (loading) return <main className={styles.message}>読み込み中...</main>;
  if (!series) return <main className={styles.message}>大会シリーズが見つかりません</main>;

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>大会シリーズへの参加</p>
        <h1 className={styles.title}>{series.name}</h1>
        {series.description && <p className={styles.description}>{series.description}</p>}
        <label className={styles.field}>
          <span>あなたの名前</span>
          <Input
            aria-label="あなたの名前"
            value={playerName}
            maxLength={32}
            onChange={(event) => setPlayerName(event.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            fullWidth
          />
        </label>
        <Button
          onClick={handleJoin}
          disabled={joining || isComposing || !normalizedPlayerName}
          fullWidth
        >
          {joining ? '参加中...' : '大会シリーズに参加する'}
        </Button>
      </section>
    </main>
  );
};

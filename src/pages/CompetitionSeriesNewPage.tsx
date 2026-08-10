import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/useAuth';
import { useSnackbar } from '../contexts/SnackbarContext';
import { createCompetitionSeries } from '../services/competitionSeriesService';
import { generateId } from '../utils/id';
import styles from './CompetitionSeriesNewPage.module.css';

export const CompetitionSeriesNewPage = () => {
  const { uid } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uid || !name.trim()) return;
    const id = generateId();
    setSaving(true);
    try {
      await createCompetitionSeries({
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        organizerId: uid,
        coOrganizerIds: [],
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      navigate(`/competition-series/${id}`);
    } catch (error) {
      showSnackbar(error instanceof Error ? error.message : '大会シリーズの作成に失敗しました');
      setSaving(false);
    }
  };

  return (
    <main className={styles.container}>
      <Link to="/competition-series" className={styles.backLink}>
        ← 大会シリーズ一覧に戻る
      </Link>
      <h1 className={styles.title}>大会シリーズを作成</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>シリーズ名</span>
          <Input
            aria-label="シリーズ名"
            value={name}
            maxLength={50}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>説明</span>
          <textarea
            className={styles.textarea}
            aria-label="説明"
            value={description}
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className={styles.dateGrid}>
          <label className={styles.field}>
            <span>開始日</span>
            <Input
              aria-label="開始日"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>終了日</span>
            <Input
              aria-label="終了日"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? '作成中...' : 'シリーズを作成'}
        </Button>
      </form>
    </main>
  );
};

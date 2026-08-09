import { useState } from 'react';
import type { TableRank } from '../../types';
import { TABLE_RANKS } from '../../utils/autoTableAssignment';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import styles from './CreateTableModal.module.css';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (name: string, mode: '3ma' | '4ma', rank: TableRank) => Promise<void>;
}

export const CreateTableModal = ({ isOpen, onClose, onCreateTable }: CreateTableModalProps) => {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'3ma' | '4ma'>('4ma');
  const [rank, setRank] = useState<TableRank>(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      await onCreateTable(trimmed, mode, rank);
      setName('');
      setMode('4ma');
      setRank(1);
      onClose();
    } catch {
      // Error handling delegated to caller via snackbar
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setName('');
    setMode('4ma');
    setRank(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="卓を作成">
      <div className={styles.form}>
        <Input
          fullWidth
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="卓名（例: A卓）"
          required
          maxLength={30}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />

        <div className={styles.modeSection}>
          <span className={styles.modeLabel}>対局モード</span>
          <div className={styles.segmentGroup}>
            <button
              type="button"
              className={`${styles.segment} ${mode === '4ma' ? styles.segmentActive : ''}`}
              onClick={() => setMode('4ma')}
              disabled={loading}
            >
              4麻
            </button>
            <button
              type="button"
              className={`${styles.segment} ${mode === '3ma' ? styles.segmentActive : ''}`}
              onClick={() => setMode('3ma')}
              disabled={loading}
            >
              3麻
            </button>
          </div>
        </div>

        <label className={styles.rankSection}>
          <span className={styles.modeLabel}>卓ランク</span>
          <select
            className={styles.rankSelect}
            value={rank}
            onChange={(event) => setRank(Number(event.target.value) as TableRank)}
            disabled={loading}
          >
            {TABLE_RANKS.map((value) => (
              <option key={value} value={value}>
                ランク{value}
                {value === 1 ? '（最上位）' : ''}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!name.trim() || loading}>
            {loading ? '作成中...' : '作成'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

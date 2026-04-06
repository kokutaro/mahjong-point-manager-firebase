import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import styles from './CreateTableModal.module.css';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (name: string, mode: '3ma' | '4ma') => Promise<void>;
}

export const CreateTableModal = ({ isOpen, onClose, onCreateTable }: CreateTableModalProps) => {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'3ma' | '4ma'>('4ma');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      await onCreateTable(trimmed, mode);
      setName('');
      setMode('4ma');
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

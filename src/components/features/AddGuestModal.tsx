import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => Promise<void>;
}

export const AddGuestModal = ({ isOpen, onClose, onAdd }: AddGuestModalProps) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      await onAdd(trimmed);
      setName('');
      onClose();
    } catch {
      // Error handling is delegated to callers via snackbar
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="ゲストを追加">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>
        <Input
          fullWidth
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ゲスト名"
          required
          maxLength={30}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-s)' }}>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!name.trim() || loading}>
            {loading ? '追加中...' : '追加'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

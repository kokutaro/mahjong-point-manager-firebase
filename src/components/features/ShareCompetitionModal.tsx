import QRCode from 'react-qr-code';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  competitionId: string;
}

export const ShareCompetitionModal = ({ isOpen, onClose, competitionId }: Props) => {
  const { showSnackbar } = useSnackbar();
  const shareUrl = `${window.location.origin}/competitions/${competitionId}/join`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSnackbar('URLをコピーしました');
    } catch {
      showSnackbar('コピーに失敗しました');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="大会を共有">
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            background: 'white',
            padding: 'var(--spacing-m)',
            borderRadius: 'var(--border-radius-m)',
            display: 'inline-block',
            marginBottom: 'var(--spacing-m)',
          }}
        >
          <QRCode value={shareUrl} size={200} />
        </div>
        <div
          style={{
            wordBreak: 'break-all',
            marginBottom: 'var(--spacing-m)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-s)',
          }}
        >
          {shareUrl}
        </div>
        <Button variant="primary" onClick={handleCopy} fullWidth>
          URLをコピー
        </Button>
      </div>
    </Modal>
  );
};

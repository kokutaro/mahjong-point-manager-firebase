import QRCodeDefault from 'react-qr-code';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { resolveQrCodeComponent } from '../../utils/resolveQrCodeComponent';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './ShareCompetitionSeriesModal.module.css';

const QRCode = resolveQrCodeComponent(QRCodeDefault, QRCodeDefault);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  seriesId: string;
}

export const ShareCompetitionSeriesModal = ({ isOpen, onClose, seriesId }: Props) => {
  const { showSnackbar } = useSnackbar();
  const shareUrl = `${window.location.origin}/competition-series/${seriesId}/join`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSnackbar('参加リンクをコピーしました');
    } catch {
      showSnackbar('コピーに失敗しました');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="大会シリーズを共有">
      <div className={styles.content}>
        <div className={styles.qrPanel} aria-label="大会シリーズ参加QRコード">
          <QRCode value={shareUrl} size={200} />
        </div>
        <p className={styles.url}>{shareUrl}</p>
        <Button onClick={handleCopy} fullWidth>
          参加リンクをコピー
        </Button>
      </div>
    </Modal>
  );
};

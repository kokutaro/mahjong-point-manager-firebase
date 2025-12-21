import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface MatchFinishedModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const MatchFinishedModal = ({ isOpen, onConfirm }: MatchFinishedModalProps) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setCountdown(5), 0); // Reset when closed
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirm(); // Trigger confirm on 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onConfirm]);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="対局終了" width="300px">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center',
          padding: '16px 0',
        }}
      >
        <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>対局が終了しました</p>
        <div style={{ width: '100%' }}>
          <Button onClick={onConfirm} fullWidth>
            成績を見る ({countdown}s)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

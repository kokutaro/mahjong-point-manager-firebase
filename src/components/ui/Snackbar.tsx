import React, { useEffect } from 'react';
import { Button } from './Button';
import styles from './Snackbar.module.css';

export type SnackbarPosition = 'bottom' | 'top';

interface SnackbarProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  position?: SnackbarPosition;
  autoHideDuration?: number;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  message,
  isOpen,
  onClose,
  position = 'bottom',
  autoHideDuration = 3000,
}) => {
  useEffect(() => {
    if (isOpen && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoHideDuration, onClose]);

  const positionClass = position === 'top' ? styles.top : styles.bottom;
  const visibilityClass = isOpen ? styles.open : '';

  return (
    <div className={`${styles.snackbar} ${positionClass} ${visibilityClass}`} role="alert">
      <span>{message}</span>
      <Button
        variant="ghost"
        size="small"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </Button>
    </div>
  );
};

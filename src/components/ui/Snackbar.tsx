import React, { useEffect } from 'react';
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
      <button className={styles.closeButton} onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>
  );
};

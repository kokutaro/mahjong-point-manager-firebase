import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal = ({ isOpen, onClose, title, children, width }: ModalProps) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const pointerStartedOnOverlayRef = useRef(false);

  if (isOpen && !isVisible) {
    setIsVisible(true);
  }

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200); // Match CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isVisible && !isOpen) return null;

  const isPrimaryPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    return event.isPrimary && event.button === 0;
  };

  const handleOverlayPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    pointerStartedOnOverlayRef.current =
      isPrimaryPointer(event) && event.target === event.currentTarget;
  };

  const handleOverlayPointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isPrimaryPointer(event)) {
      pointerStartedOnOverlayRef.current = false;
      return;
    }

    const endedOnOverlay = event.target === event.currentTarget;
    if (pointerStartedOnOverlayRef.current && endedOnOverlay) {
      onClose();
    }
    pointerStartedOnOverlayRef.current = false;
  };

  const handleOverlayPointerCancel: React.PointerEventHandler<HTMLDivElement> = () => {
    pointerStartedOnOverlayRef.current = false;
  };

  return createPortal(
    <div
      className={`${styles.overlay} ${!isOpen ? styles.overlayClosing : ''}`}
      onPointerCancel={handleOverlayPointerCancel}
      onPointerDown={handleOverlayPointerDown}
      onPointerUp={handleOverlayPointerUp}
    >
      <div
        className={`${styles.modal} ${!isOpen ? styles.modalClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ width: width }}
      >
        {title && (
          <div className={styles.header}>
            <h3>{title}</h3>
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

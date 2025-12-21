import React, { useEffect, useState } from 'react';
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

  return createPortal(
    <div 
      className={`${styles.overlay} ${!isOpen ? styles.overlayClosing : ''}`} 
      onClick={onClose}
    >
      <div 
        className={`${styles.modal} ${!isOpen ? styles.modalClosing : ''}`} 
        onClick={e => e.stopPropagation()} 
        style={{ width: width }}
      >
        {title && <div className={styles.header}><h3>{title}</h3></div>}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

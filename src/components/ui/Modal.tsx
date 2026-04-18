import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

const getFocusableElements = (container: HTMLDivElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
};

export const Modal = ({ isOpen, onClose, title, children, width }: ModalProps) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const pointerStartedOnOverlayRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

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
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      previouslyFocusedElementRef.current?.focus();
      return;
    }

    const [firstFocusableElement] = getFocusableElements(modalRef.current);
    (firstFocusableElement ?? modalRef.current)?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) {
        return;
      }

      const focusableElements = getFocusableElements(modalRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (activeElement === modalRef.current) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

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
        ref={modalRef}
        className={`${styles.modal} ${!isOpen ? styles.modalClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ width: width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {title && (
          <div className={styles.header}>
            <h3 id={titleId}>{title}</h3>
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

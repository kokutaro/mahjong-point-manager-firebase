// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

afterEach(() => {
  cleanup();
});

const renderModal = (onClose = vi.fn()) => {
  render(
    <Modal isOpen onClose={onClose} title="テストモーダル">
      <div>モーダル内容</div>
    </Modal>,
  );

  const contentText = screen.getByText('モーダル内容');
  const contentContainer = contentText.parentElement as HTMLElement;
  const modalContainer = contentContainer.parentElement as HTMLElement;
  const overlay = modalContainer.parentElement as HTMLElement;

  return { onClose, modalContainer, overlay };
};

describe('Modal', () => {
  it('closes when pointer starts and ends on overlay', () => {
    const { onClose, overlay } = renderModal();

    fireEvent.pointerDown(overlay, { button: 0, isPrimary: true });
    fireEvent.pointerUp(overlay, { button: 0, isPrimary: true });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when pointer starts inside modal and ends on overlay', () => {
    const { onClose, modalContainer, overlay } = renderModal();

    fireEvent.pointerDown(modalContainer, { button: 0, isPrimary: true });
    fireEvent.pointerUp(overlay, { button: 0, isPrimary: true });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when pointer starts on overlay and ends inside modal', () => {
    const { onClose, modalContainer, overlay } = renderModal();

    fireEvent.pointerDown(overlay, { button: 0, isPrimary: true });
    fireEvent.pointerUp(modalContainer, { button: 0, isPrimary: true });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close after pointer is canceled before pointer up on overlay', () => {
    const { onClose, overlay } = renderModal();

    fireEvent.pointerDown(overlay, { button: 0, isPrimary: true });
    fireEvent.pointerCancel(overlay, { button: 0, isPrimary: true });
    fireEvent.pointerUp(overlay, { button: 0, isPrimary: true });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when using non-primary mouse button on overlay', () => {
    const { onClose, overlay } = renderModal();

    fireEvent.pointerDown(overlay, { button: 2, isPrimary: true });
    fireEvent.pointerUp(overlay, { button: 2, isPrimary: true });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape key while open', () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

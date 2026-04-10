// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import { CreateRoomModal } from './CreateRoomModal';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const renderModal = (onCreate = vi.fn()) => {
  render(
    <SnackbarProvider>
      <CreateRoomModal isOpen onClose={() => undefined} onCreate={onCreate} />
    </SnackbarProvider>,
  );

  return { onCreate };
};

describe('CreateRoomModal', () => {
  it('creates a 4ma room with no uma when the none preset is selected', () => {
    const { onCreate } = renderModal();

    fireEvent.change(screen.getByPlaceholderText('表示名を入力'), {
      target: { value: 'テストホスト' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'なし' }));
    fireEvent.click(screen.getByRole('button', { name: '部屋作成' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0].mode).toBe('4ma');
    expect(onCreate.mock.calls[0][0].uma).toEqual([0, 0]);
    expect(onCreate.mock.calls[0][1]).toBe('テストホスト');
  });

  it('keeps the none preset available after switching to 3ma', async () => {
    const { onCreate } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: '3人打ち' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '35000 / 40000' })).not.toBeNull();
    });

    fireEvent.change(screen.getByPlaceholderText('表示名を入力'), {
      target: { value: '三麻ホスト' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'なし' }));
    fireEvent.click(screen.getByRole('button', { name: '部屋作成' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0].mode).toBe('3ma');
    expect(onCreate.mock.calls[0][0].uma).toEqual([0, 0]);
  });
});

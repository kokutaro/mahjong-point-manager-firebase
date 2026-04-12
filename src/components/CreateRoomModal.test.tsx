// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('normalizes custom start and return points to 1000-point units', () => {
    const { onCreate } = renderModal();

    const pointField = screen.getByText('配給原点 / カエシ点').parentElement;
    expect(pointField).not.toBeNull();
    const scoped = within(pointField as HTMLElement);

    fireEvent.click(scoped.getByRole('button', { name: 'カスタム' }));

    const pointInputs = scoped.getAllByRole('spinbutton');
    fireEvent.change(pointInputs[0], { target: { value: '25555' } });
    fireEvent.change(pointInputs[1], { target: { value: '30123' } });

    fireEvent.change(screen.getByPlaceholderText('表示名を入力'), {
      target: { value: '正規化テスト' },
    });
    fireEvent.click(screen.getByRole('button', { name: '部屋作成' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0].startPoint).toBe(26000);
    expect(onCreate.mock.calls[0][0].returnPoint).toBe(30000);
  });

  it('keeps custom point editor visible even when values match a preset', () => {
    renderModal();

    const pointField = screen.getByText('配給原点 / カエシ点').parentElement;
    expect(pointField).not.toBeNull();
    const scoped = within(pointField as HTMLElement);

    fireEvent.click(scoped.getByRole('button', { name: 'カスタム' }));

    const initialInputs = scoped.getAllByRole('spinbutton');
    fireEvent.change(initialInputs[0], { target: { value: '30000' } });

    expect(scoped.getAllByRole('spinbutton')).toHaveLength(2);
    expect(scoped.getByText('配給原点')).not.toBeNull();
    expect(scoped.getByText('返し点')).not.toBeNull();
  });
});

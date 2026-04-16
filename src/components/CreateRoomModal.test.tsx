// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import type { GameSettings } from '../types';
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
  it('applies async initial values when the form is still untouched', async () => {
    const onCreate = vi.fn();
    const asyncSettings: GameSettings = {
      mode: '3ma',
      length: 'Tonpu',
      startPoint: 35000,
      returnPoint: 40000,
      uma: [0, 0],
      hasHonba: false,
      honbaPoints: 1500,
      tenpaiRenchan: false,
      useTobi: false,
      useChip: true,
      chipRate: 100,
      useOka: false,
      isSingleMode: false,
      useFuCalculation: false,
      noFuFixedPoints: {
        1: { child: 1200, dealer: 1800 },
        2: { child: 2400, dealer: 3600 },
        3: { child: 4800, dealer: 7200 },
      },
      westExtension: true,
      rate: 100,
    };

    const { rerender } = render(
      <SnackbarProvider>
        <CreateRoomModal isOpen onClose={() => undefined} onCreate={onCreate} />
      </SnackbarProvider>,
    );

    rerender(
      <SnackbarProvider>
        <CreateRoomModal
          isOpen
          onClose={() => undefined}
          onCreate={onCreate}
          initialHostName="同期表示名"
          initialSettings={asyncSettings}
        />
      </SnackbarProvider>,
    );

    await waitFor(() => {
      expect((screen.getByPlaceholderText('表示名を入力') as HTMLInputElement).value).toBe(
        '同期表示名',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '部屋作成' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith(asyncSettings, '同期表示名', undefined, '');
  });

  it('uses provided initial host name and room settings', async () => {
    const onCreate = vi.fn();
    const initialSettings: GameSettings = {
      mode: '3ma',
      length: 'Tonpu',
      startPoint: 35000,
      returnPoint: 40000,
      uma: [0, 0],
      hasHonba: false,
      honbaPoints: 1500,
      tenpaiRenchan: false,
      useTobi: false,
      useChip: true,
      chipRate: 100,
      useOka: false,
      isSingleMode: false,
      useFuCalculation: false,
      noFuFixedPoints: {
        1: { child: 1200, dealer: 1800 },
        2: { child: 2400, dealer: 3600 },
        3: { child: 4800, dealer: 7200 },
      },
      westExtension: true,
      rate: 100,
    };

    render(
      <SnackbarProvider>
        <CreateRoomModal
          isOpen
          onClose={() => undefined}
          onCreate={onCreate}
          initialHostName="設定済み表示名"
          initialSettings={initialSettings}
        />
      </SnackbarProvider>,
    );

    await waitFor(() => {
      expect((screen.getByPlaceholderText('表示名を入力') as HTMLInputElement).value).toBe(
        '設定済み表示名',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '部屋作成' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith(initialSettings, '設定済み表示名', undefined, '');
  });

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

  it('does not overwrite in-progress edits when async initial values arrive', async () => {
    const onCreate = vi.fn();
    const asyncSettings: GameSettings = {
      mode: '4ma',
      length: 'Hanchan',
      startPoint: 25000,
      returnPoint: 30000,
      uma: [5, 10],
      hasHonba: true,
      honbaPoints: 300,
      tenpaiRenchan: true,
      useTobi: true,
      useChip: false,
      chipRate: 0,
      useOka: true,
      isSingleMode: false,
      useFuCalculation: true,
      noFuFixedPoints: {
        1: { child: 1000, dealer: 1500 },
        2: { child: 2000, dealer: 3000 },
        3: { child: 4000, dealer: 6000 },
      },
      westExtension: false,
      rate: 50,
    };

    const { rerender } = render(
      <SnackbarProvider>
        <CreateRoomModal isOpen onClose={() => undefined} onCreate={onCreate} />
      </SnackbarProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('例: 金曜日の麻雀大会'), {
      target: { value: '編集中の部屋名' },
    });
    fireEvent.change(screen.getByPlaceholderText('表示名を入力'), {
      target: { value: '編集中ホスト' },
    });
    fireEvent.click(screen.getByRole('button', { name: '3人打ち' }));
    fireEvent.click(screen.getByLabelText('単独モード (1台で操作)'));
    fireEvent.change(screen.getByPlaceholderText('プレイヤー2の名前'), {
      target: { value: 'プレイヤーA' },
    });
    fireEvent.change(screen.getByPlaceholderText('プレイヤー3の名前'), {
      target: { value: 'プレイヤーB' },
    });

    rerender(
      <SnackbarProvider>
        <CreateRoomModal
          isOpen
          onClose={() => undefined}
          onCreate={onCreate}
          initialHostName="同期表示名"
          initialSettings={asyncSettings}
        />
      </SnackbarProvider>,
    );

    await waitFor(() => {
      expect((screen.getByPlaceholderText('例: 金曜日の麻雀大会') as HTMLInputElement).value).toBe(
        '編集中の部屋名',
      );
    });

    expect((screen.getByPlaceholderText('表示名を入力') as HTMLInputElement).value).toBe(
      '編集中ホスト',
    );
    expect((screen.getByPlaceholderText('プレイヤー2の名前') as HTMLInputElement).value).toBe(
      'プレイヤーA',
    );
    expect((screen.getByPlaceholderText('プレイヤー3の名前') as HTMLInputElement).value).toBe(
      'プレイヤーB',
    );

    fireEvent.click(screen.getByRole('button', { name: '部屋作成' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: '3ma',
        isSingleMode: true,
      }),
      '編集中ホスト',
      ['プレイヤーA', 'プレイヤーB'],
      '編集中の部屋名',
    );
  });
});

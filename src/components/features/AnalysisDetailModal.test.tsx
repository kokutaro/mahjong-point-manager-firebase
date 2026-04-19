// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisEntry } from '../../types';
import { AnalysisDetailModal } from './AnalysisDetailModal';

afterEach(() => {
  cleanup();
});

const createAnalysisEntry = (
  overrides: Partial<AnalysisEntry> = {},
  nestedOverrides?: {
    source?: Partial<AnalysisEntry['source']>;
    context?: Partial<AnalysisEntry['context']>;
    round?: Partial<AnalysisEntry['context']['round']>;
    hand?: Partial<AnalysisEntry['hand']>;
    dora?: Partial<AnalysisEntry['dora']>;
    yaku?: Partial<AnalysisEntry['yaku']>;
  },
): AnalysisEntry => ({
  id: 'analysis-1',
  uid: 'user-1',
  source: {
    kind: 'room',
    roomId: 'room-1',
    handLogId: 'hand-1',
    ...nestedOverrides?.source,
  },
  context: {
    round: {
      wind: 'East',
      number: 1,
      honba: 1,
      ...nestedOverrides?.round,
    },
    seatWind: 'South',
    roundWind: 'East',
    eventType: 'win',
    isDealer: false,
    ...nestedOverrides?.context,
  },
  hand: {
    concealed: ['2m', '3m'],
    melds: [],
    winningTile: '4m',
    wait: [],
    ...nestedOverrides?.hand,
  },
  dora: {
    doraIndicators: [],
    uraIndicators: [],
    kanDoraIndicators: [],
    kanUraIndicators: [],
    redFiveCount: 0,
    ...nestedOverrides?.dora,
  },
  yaku: {
    list: [],
    yakuman: [],
    ippatsu: false,
    riichi: 'none',
    special: null,
    han: 3,
    fu: 40,
    ...nestedOverrides?.yaku,
  },
  notes: '',
  createdAt: 1000,
  updatedAt: 2000,
  ...overrides,
});

describe('AnalysisDetailModal', () => {
  it('shows the target event summary', () => {
    render(
      <AnalysisDetailModal
        isOpen
        mode="create"
        entry={createAnalysisEntry()}
        onClose={() => undefined}
        onSave={() => Promise.resolve()}
      />,
    );

    expect(screen.getByText('東1局 1本場')).not.toBeNull();
    expect(screen.getByText('イベント')).not.toBeNull();
    expect(screen.getByText('和了')).not.toBeNull();
    expect(screen.getByText('自風: 南')).not.toBeNull();
    expect(screen.getByText('ソース: room / hand-1')).not.toBeNull();
  });

  it('does not render a winning tile editor for tenpai-draw', () => {
    render(
      <AnalysisDetailModal
        isOpen
        mode="create"
        entry={createAnalysisEntry(
          {},
          {
            context: { eventType: 'tenpai-draw' },
            hand: { winningTile: undefined },
          },
        )}
        onClose={() => undefined}
        onSave={() => Promise.resolve()}
      />,
    );

    expect(screen.queryByText('和了牌')).toBeNull();
  });

  it('saves tile and memo changes', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AnalysisDetailModal
        isOpen
        mode="create"
        entry={createAnalysisEntry()}
        onClose={() => undefined}
        onSave={handleSave}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' }), {
      target: { value: 'm1234_' },
    });
    fireEvent.change(screen.getByLabelText('メモ'), {
      target: { value: '良いリーチ判断だった' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedEntry = handleSave.mock.calls[0][0] as AnalysisEntry;
    expect(savedEntry.hand.concealed).toContain('1m');
    expect(savedEntry.hand.winningTile).toBe('4m');
    expect(savedEntry.notes).toBe('良いリーチ判断だった');
  });

  it('preserves tsumo marker information when saving MPSZ notation', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AnalysisDetailModal
        isOpen
        mode="create"
        entry={createAnalysisEntry()}
        onClose={() => undefined}
        onSave={handleSave}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' }), {
      target: { value: 'm1234_' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedHand = handleSave.mock.calls[0][0].hand as AnalysisEntry['hand'] & {
      winningTileSource?: string;
    };

    expect(savedHand.winningTile).toBe('4m');
    expect(savedHand.winningTileSource).toBe('tsumo');
  });

  it('preserves ron marker information when saving MPSZ notation', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AnalysisDetailModal
        isOpen
        mode="create"
        entry={createAnalysisEntry()}
        onClose={() => undefined}
        onSave={handleSave}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' }), {
      target: { value: 'm1234-' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedHand = handleSave.mock.calls[0][0].hand as AnalysisEntry['hand'] & {
      winningTileSource?: string;
    };

    expect(savedHand.winningTile).toBe('4m');
    expect(savedHand.winningTileSource).toBe('shimocha');
  });

  it('rebuilds the MPSZ input with the stored winning marker', () => {
    render(
      <AnalysisDetailModal
        isOpen
        mode="edit"
        entry={
          {
            ...createAnalysisEntry(),
            hand: {
              concealed: ['1m', '2m', '3m'],
              melds: [],
              winningTile: '4m',
              wait: [],
              winningTileSource: 'tsumo',
            },
          } as AnalysisEntry
        }
        onClose={() => undefined}
        onSave={() => Promise.resolve()}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    expect((input as HTMLInputElement).value).toBe('m1234_');
  });

  it('falls back to showing the winning tile in MPSZ input when old data has no marker source', () => {
    render(
      <AnalysisDetailModal
        isOpen
        mode="edit"
        entry={createAnalysisEntry(
          {},
          {
            hand: {
              concealed: ['1m', '2m', '3m'],
              melds: [],
              winningTile: '4m',
              wait: [],
            },
          },
        )}
        onClose={() => undefined}
        onSave={() => Promise.resolve()}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    expect((input as HTMLInputElement).value).toBe('m1234');
  });

  it('does not duplicate the winning tile in MPSZ input for legacy data that already includes it in concealed tiles', () => {
    render(
      <AnalysisDetailModal
        isOpen
        mode="edit"
        entry={createAnalysisEntry(
          {},
          {
            hand: {
              concealed: ['1m', '2m', '3m', '4m'],
              melds: [],
              winningTile: '4m',
              wait: [],
            },
          },
        )}
        onClose={() => undefined}
        onSave={() => Promise.resolve()}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' });
    expect((input as HTMLInputElement).value).toBe('m1234');
  });

  it('saves dora changes via MPSZ notation', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AnalysisDetailModal
        isOpen
        mode="create"
        entry={createAnalysisEntry(
          {},
          {
            hand: {
              concealed: ['2m', '3m', '4m'],
              winningTile: '2m',
            },
          },
        )}
        onClose={() => undefined}
        onSave={handleSave}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'ドラ表示牌' }), {
      target: { value: 'm1' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '裏ドラ表示牌' }), {
      target: { value: 'p2' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '槓ドラ表示牌' }), {
      target: { value: 's3' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedEntry = handleSave.mock.calls[0][0] as AnalysisEntry;
    expect(savedEntry.dora.doraIndicators).toEqual(['1m']);
    expect(savedEntry.dora.uraIndicators).toEqual(['2p']);
    expect(savedEntry.dora.kanDoraIndicators).toEqual(['3s']);
  });

  it('shows warnings for incomplete input but still allows saving', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AnalysisDetailModal
        isOpen
        mode="create"
        entry={createAnalysisEntry(
          {},
          {
            hand: {
              concealed: [],
              melds: [],
              winningTile: undefined,
              wait: [],
            },
          },
        )}
        onClose={() => undefined}
        onSave={handleSave}
      />,
    );

    expect(screen.getByText('入力は未完成ですが保存できます。')).not.toBeNull();
    expect(screen.getByText('和了牌が未入力です')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });
  });

  it('allows deleting in edit mode', async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <AnalysisDetailModal
        isOpen
        mode="edit"
        entry={createAnalysisEntry()}
        onClose={() => undefined}
        onSave={() => Promise.resolve()}
        onDelete={handleDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '削除' }));

    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'analysis-1' }));
    });
  });

  it('disables editing controls while busy', () => {
    render(
      <AnalysisDetailModal
        isOpen
        mode="edit"
        entry={createAnalysisEntry()}
        isSaving
        onClose={() => undefined}
        onSave={() => Promise.resolve()}
        onDelete={() => Promise.resolve()}
      />,
    );

    expect((screen.getByRole('button', { name: '削除' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'キャンセル' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: '保存中...' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect((screen.getByLabelText('メモ') as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('saves winning tile from MPSZ ron notation for deal-in entries', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AnalysisDetailModal
        isOpen
        mode="create"
        entry={createAnalysisEntry(
          {},
          {
            context: { eventType: 'deal-in' },
            hand: {
              concealed: ['2m', '3m', '4m'],
              winningTile: undefined,
            },
          },
        )}
        onClose={() => undefined}
        onSave={handleSave}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' }), {
      target: { value: 'm2345-' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedEntry = handleSave.mock.calls[0][0] as AnalysisEntry;
    expect(savedEntry.hand.winningTile).toBe('5m');
  });

  it('is read only in view mode', () => {
    render(
      <AnalysisDetailModal
        isOpen
        mode="view"
        entry={createAnalysisEntry()}
        onClose={() => undefined}
      />,
    );

    expect((screen.getByLabelText('メモ') as HTMLTextAreaElement).readOnly).toBe(true);
    expect(
      (screen.getByRole('textbox', { name: 'MPSZ形式で手牌を入力' }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull();
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull();
  });
});

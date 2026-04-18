// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisEntry } from '../types';
import { AnalysisListPage } from './AnalysisListPage';

const mockNavigate = vi.fn();
const mockSaveAnalysisEntry = vi.fn();
const mockDeleteAnalysisEntry = vi.fn();

const entries: AnalysisEntry[] = [
  {
    id: 'entry-1',
    uid: 'user-1',
    source: {
      kind: 'room',
      roomId: 'room-1',
      handLogId: 'hand-1',
    },
    context: {
      round: { wind: 'East', number: 1, honba: 0 },
      seatWind: 'East',
      roundWind: 'East',
      eventType: 'win',
      isDealer: true,
    },
    hand: { concealed: [], melds: [], wait: [] },
    dora: {
      doraIndicators: [],
      uraIndicators: [],
      kanDoraIndicators: [],
      kanUraIndicators: [],
      redFiveCount: 0,
    },
    yaku: {
      list: ['riichi'],
      yakuman: [],
      ippatsu: false,
      riichi: 'normal',
      special: null,
      han: 3,
      fu: 40,
    },
    notes: 'リーチ判断',
    createdAt: 1710000000000,
    updatedAt: 1710000002000,
  },
  {
    id: 'entry-2',
    uid: 'user-1',
    source: {
      kind: 'competition',
      competitionId: 'competition-1',
      gameResultId: 'game-1',
      handLogId: 'hand-2',
    },
    context: {
      round: { wind: 'South', number: 2, honba: 1 },
      seatWind: 'South',
      roundWind: 'South',
      eventType: 'deal-in',
      isDealer: false,
    },
    hand: { concealed: [], melds: [], wait: [] },
    dora: {
      doraIndicators: [],
      uraIndicators: [],
      kanDoraIndicators: [],
      kanUraIndicators: [],
      redFiveCount: 0,
    },
    yaku: {
      list: [],
      yakuman: [],
      ippatsu: false,
      riichi: 'none',
      special: null,
    },
    notes: '押し返し失敗',
    createdAt: 1710000000000,
    updatedAt: 1710000001000,
  },
];

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../hooks/useAnalysisEntries', () => ({
  useAnalysisEntries: () => ({
    uid: 'user-1',
    entries,
    loading: false,
  }),
}));

vi.mock('../hooks/useAnalysisEntry', () => ({
  useAnalysisEntry: ({ entryId }: { entryId?: string | null }) => ({
    uid: 'user-1',
    analysisEntry: entries.find((entry) => entry.id === entryId) ?? null,
    draftAnalysisEntry: entries.find((entry) => entry.id === entryId) ?? null,
    hasDraftChanges: false,
    loading: false,
    saving: false,
    deleting: false,
    setDraftAnalysisEntry: vi.fn(),
    resetDraftAnalysisEntry: vi.fn(),
    saveAnalysisEntry: mockSaveAnalysisEntry,
    deleteAnalysisEntry: mockDeleteAnalysisEntry,
  }),
}));

vi.mock('../components/features/AnalysisDetailModal', () => ({
  AnalysisDetailModal: ({
    isOpen,
    mode,
    entry,
    onClose,
    onSave,
    onDelete,
  }: {
    isOpen: boolean;
    mode: string;
    entry: AnalysisEntry;
    onClose: () => void;
    onSave?: (entry: AnalysisEntry) => Promise<void> | void;
    onDelete?: (entry: AnalysisEntry) => Promise<void> | void;
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div>
        <span>modal:{mode}</span>
        <span>{entry.id}</span>
        <button type="button" onClick={() => onSave?.(entry)}>
          save
        </button>
        <button type="button" onClick={() => onDelete?.(entry)}>
          delete
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    );
  },
}));

describe('AnalysisListPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSaveAnalysisEntry.mockReset();
    mockDeleteAnalysisEntry.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('filters entries by event type and opens view mode from the list', async () => {
    render(<AnalysisListPage />);

    expect(screen.getByText('リーチ判断')).not.toBeNull();
    expect(screen.getByText('押し返し失敗')).not.toBeNull();
    expect(screen.getByText('立直')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('イベント種別'), {
      target: { value: 'deal-in' },
    });

    expect(screen.queryByText('リーチ判断')).toBeNull();
    expect(screen.getByText('押し返し失敗')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '南2局 1本場 放銃' }));

    expect(screen.getByText('modal:view')).not.toBeNull();
    expect(screen.getByText('entry-2')).not.toBeNull();
  });

  it('opens edit mode and saves the selected entry', async () => {
    render(<AnalysisListPage />);

    fireEvent.click(screen.getAllByRole('button', { name: '編集' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(mockSaveAnalysisEntry).toHaveBeenCalledWith(entries[0]);
    });
  });
});

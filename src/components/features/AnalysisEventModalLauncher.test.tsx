// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalysisEntry } from '../../hooks/useAnalysisEntry';
import type { HandLog } from '../../types';
import type { AnalysisEntry } from '../../types/analysis';
import {
  AnalysisEventModalLauncher,
  type AnalysisModalSelection,
} from './AnalysisEventModalLauncher';

vi.mock('../../hooks/useAnalysisEntry', () => ({
  useAnalysisEntry: vi.fn(),
}));

vi.mock('./AnalysisDetailModal', () => ({
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
        <span>mode:{mode}</span>
        <span>entry-id:{entry.id}</span>
        <span>entry-uid:{entry.uid}</span>
        <span>entry-source:{entry.source.handLogId}</span>
        <span>entry-event:{entry.context.eventType}</span>
        <span>entry-riichi:{entry.yaku.riichi}</span>
        {onSave ? (
          <button type="button" onClick={() => onSave(entry)}>
            save
          </button>
        ) : null}
        {onDelete ? (
          <button type="button" onClick={() => onDelete(entry)}>
            delete
          </button>
        ) : null}
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    );
  },
}));

afterEach(() => {
  cleanup();
});

const mockUseAnalysisEntry = vi.mocked(useAnalysisEntry);
type UseAnalysisEntryResult = ReturnType<typeof useAnalysisEntry>;

const createHandLog = (id = 'hand-1'): HandLog => ({
  id,
  timestamp: 1710000000000,
  round: {
    wind: 'East',
    number: 1,
    honba: 0,
    riichiSticks: 1,
  },
  result: {
    type: 'Win',
    winners: [
      {
        id: 'user-1',
        payment: {
          basePoints: 2000,
          name: '40符3翻',
          ron: 7700,
        },
      },
    ],
    loserId: 'player-2',
    riichiPlayerIds: ['user-1'],
    scoreDeltas: {
      'user-1': 7700,
      'player-2': -7700,
    },
  },
});

const createSelection = (): AnalysisModalSelection => ({
  handLog: createHandLog(),
  source: {
    kind: 'room',
    roomId: 'room-1',
    handLogId: 'hand-1',
  },
  players: [
    { id: 'user-1', name: '自分', wind: 'East' },
    { id: 'player-2', name: '相手', wind: 'South' },
  ],
});

const createEntry = (): AnalysisEntry => ({
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
  hand: {
    concealed: [],
    melds: [],
    wait: [],
  },
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
    riichi: 'normal',
    special: null,
    han: 3,
    fu: 40,
  },
  notes: '',
  createdAt: 1710000000000,
  updatedAt: 1710000001000,
});

const mockSaveAnalysisEntry = vi.fn(async () => undefined);
const mockDeleteAnalysisEntry = vi.fn(async () => undefined);

const mockHookResult = ({
  uid = 'user-1',
  analysisEntry = null,
  loading = false,
  saving = false,
  deleting = false,
}: {
  uid?: string | null;
  analysisEntry?: AnalysisEntry | null;
  loading?: boolean;
  saving?: boolean;
  deleting?: boolean;
} = {}) =>
  ({
    uid,
    analysisEntry,
    draftAnalysisEntry: analysisEntry,
    hasDraftChanges: false,
    loading,
    saving,
    deleting,
    setDraftAnalysisEntry: vi.fn(),
    resetDraftAnalysisEntry: vi.fn(),
    saveAnalysisEntry: mockSaveAnalysisEntry,
    deleteAnalysisEntry: mockDeleteAnalysisEntry,
  }) satisfies UseAnalysisEntryResult;

describe('AnalysisEventModalLauncher', () => {
  beforeEach(() => {
    mockUseAnalysisEntry.mockReset();
    mockSaveAnalysisEntry.mockReset();
    mockDeleteAnalysisEntry.mockReset();
    mockSaveAnalysisEntry.mockResolvedValue(undefined);
    mockDeleteAnalysisEntry.mockResolvedValue(undefined);
  });

  it('renders a loading state while the analysis entry is being prepared', () => {
    mockUseAnalysisEntry.mockReturnValue(mockHookResult({ loading: true }));

    render(<AnalysisEventModalLauncher isOpen selection={createSelection()} onClose={vi.fn()} />);

    expect(screen.getByText('分析メモを読み込んでいます...')).not.toBeNull();
    expect(screen.queryByText(/mode:/)).toBeNull();
  });

  it('opens an existing entry in edit mode by default', () => {
    mockUseAnalysisEntry.mockReturnValue(mockHookResult({ analysisEntry: createEntry() }));

    render(<AnalysisEventModalLauncher isOpen selection={createSelection()} onClose={vi.fn()} />);

    expect(screen.getByText('mode:edit')).not.toBeNull();
    expect(screen.getByText('entry-id:entry-1')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'save' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'delete' })).not.toBeNull();
  });

  it('opens an existing entry in view mode without edit actions', () => {
    mockUseAnalysisEntry.mockReturnValue(mockHookResult({ analysisEntry: createEntry() }));

    render(
      <AnalysisEventModalLauncher
        isOpen
        selection={createSelection()}
        initialMode="view"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('mode:view')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'delete' })).toBeNull();
  });

  it('creates a seed entry when no existing entry is found', () => {
    mockUseAnalysisEntry.mockReturnValue(mockHookResult());

    render(<AnalysisEventModalLauncher isOpen selection={createSelection()} onClose={vi.fn()} />);

    expect(screen.getByText('mode:create')).not.toBeNull();
    expect(screen.getByText('entry-id:hand-1')).not.toBeNull();
    expect(screen.getByText('entry-uid:user-1')).not.toBeNull();
    expect(screen.getByText('entry-source:hand-1')).not.toBeNull();
    expect(screen.getByText('entry-event:win')).not.toBeNull();
    expect(screen.getByText('entry-riichi:normal')).not.toBeNull();
  });

  it('calls onClose after saving an entry', async () => {
    const onClose = vi.fn();
    const entry = createEntry();
    mockUseAnalysisEntry.mockReturnValue(mockHookResult({ analysisEntry: entry }));

    render(<AnalysisEventModalLauncher isOpen selection={createSelection()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(mockSaveAnalysisEntry).toHaveBeenCalledWith(entry);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose after deleting an entry', async () => {
    const onClose = vi.fn();
    mockUseAnalysisEntry.mockReturnValue(mockHookResult({ analysisEntry: createEntry() }));

    render(<AnalysisEventModalLauncher isOpen selection={createSelection()} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'delete' }));

    await waitFor(() => {
      expect(mockDeleteAnalysisEntry).toHaveBeenCalledTimes(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

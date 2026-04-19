// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalysisEntry } from './useAnalysisEntry';
import type { AnalysisSource } from '../types/analysis';

const mocks = vi.hoisted(() => ({
  mockAuth: {
    currentUser: {
      uid: 'user-1',
    } as { uid: string } | null,
  },
  mockOnAuthStateChanged: vi.fn(),
  mockDeleteAnalysisEntry: vi.fn(),
  mockFindAnalysisEntryByHandLog: vi.fn(),
  mockGetAnalysisEntry: vi.fn(),
  mockSaveAnalysisEntry: vi.fn(),
}));

let authStateCallback: ((user: { uid: string } | null) => void) | null = null;

const createAnalysisEntry = (id = 'entry-1') => ({
  id,
  uid: 'user-1',
  source: {
    kind: 'room' as const,
    roomId: 'room-1',
    handLogId: 'hand-1',
  },
  context: {
    round: {
      wind: 'East' as const,
      number: 1,
      honba: 0,
    },
    seatWind: 'East' as const,
    roundWind: 'East' as const,
    eventType: 'win' as const,
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
    riichi: 'none' as const,
    special: null,
  },
  notes: '',
  createdAt: 1000,
  updatedAt: 2000,
});

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mocks.mockOnAuthStateChanged(...args),
}));

vi.mock('../services/firebase', () => ({
  auth: mocks.mockAuth,
}));

vi.mock('../services/analysisService', () => ({
  deleteAnalysisEntry: (...args: unknown[]) => mocks.mockDeleteAnalysisEntry(...args),
  findAnalysisEntryByHandLog: (...args: unknown[]) => mocks.mockFindAnalysisEntryByHandLog(...args),
  getAnalysisEntry: (...args: unknown[]) => mocks.mockGetAnalysisEntry(...args),
  saveAnalysisEntry: (...args: unknown[]) => mocks.mockSaveAnalysisEntry(...args),
}));

describe('useAnalysisEntry', () => {
  beforeEach(() => {
    mocks.mockAuth.currentUser = { uid: 'user-1' };
    mocks.mockDeleteAnalysisEntry.mockReset();
    mocks.mockFindAnalysisEntryByHandLog.mockReset();
    mocks.mockGetAnalysisEntry.mockReset();
    mocks.mockSaveAnalysisEntry.mockReset();
    mocks.mockOnAuthStateChanged.mockReset();
    mocks.mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      authStateCallback = callback;
      callback(mocks.mockAuth.currentUser);
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads an entry by entryId for the authenticated user', async () => {
    const entry = createAnalysisEntry();
    mocks.mockGetAnalysisEntry.mockResolvedValue(entry);

    const { result } = renderHook(() => useAnalysisEntry({ entryId: 'entry-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mocks.mockGetAnalysisEntry).toHaveBeenCalledWith('user-1', 'entry-1');
    expect(result.current.analysisEntry).toEqual(entry);
  });

  it('falls back to loading by source when no entryId is provided', async () => {
    const entry = createAnalysisEntry('entry-2');
    const source = {
      kind: 'competition' as const,
      competitionId: 'competition-1',
      gameResultId: 'game-1',
      handLogId: 'hand-2',
    };
    mocks.mockFindAnalysisEntryByHandLog.mockResolvedValue(entry);

    const { result } = renderHook(() => useAnalysisEntry({ source }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mocks.mockFindAnalysisEntryByHandLog).toHaveBeenCalledWith('user-1', source);
    expect(result.current.analysisEntry).toEqual(entry);
  });

  it('saves the current entry with the authenticated uid', async () => {
    const entry = createAnalysisEntry();
    mocks.mockGetAnalysisEntry.mockResolvedValue(entry);

    const { result } = renderHook(() => useAnalysisEntry({ entryId: 'entry-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedEntry = {
      ...entry,
      notes: 'updated',
    };

    await act(async () => {
      await result.current.saveAnalysisEntry(updatedEntry);
    });

    expect(mocks.mockSaveAnalysisEntry).toHaveBeenCalledWith('user-1', updatedEntry);
    expect(result.current.analysisEntry).toEqual({
      ...updatedEntry,
      uid: 'user-1',
    });
  });

  it('exposes a draft entry that can be reset independently from the loaded entry', async () => {
    const entry = createAnalysisEntry();
    mocks.mockGetAnalysisEntry.mockResolvedValue(entry);

    const { result } = renderHook(() => useAnalysisEntry({ entryId: 'entry-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setDraftAnalysisEntry({
        ...entry,
        notes: 'draft note',
      });
    });

    expect(result.current.hasDraftChanges).toBe(true);
    expect(result.current.draftAnalysisEntry?.notes).toBe('draft note');
    expect(result.current.analysisEntry?.notes).toBe('');

    act(() => {
      result.current.resetDraftAnalysisEntry();
    });

    expect(result.current.hasDraftChanges).toBe(false);
    expect(result.current.draftAnalysisEntry).toEqual(entry);
  });

  it('keeps draft changes when rerendered with an equivalent source object', async () => {
    const entry = createAnalysisEntry('entry-2');
    const source = {
      kind: 'competition' as const,
      competitionId: 'competition-1',
      gameResultId: 'game-1',
      handLogId: 'hand-2',
    };
    mocks.mockFindAnalysisEntryByHandLog.mockResolvedValue(entry);

    const { result, rerender } = renderHook(
      ({ nextSource }) => useAnalysisEntry({ source: nextSource }),
      {
        initialProps: { nextSource: source },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setDraftAnalysisEntry({
        ...entry,
        notes: 'local draft',
      });
    });

    const callsBeforeRerender = mocks.mockFindAnalysisEntryByHandLog.mock.calls.length;

    rerender({
      nextSource: {
        kind: 'competition',
        competitionId: 'competition-1',
        gameResultId: 'game-1',
        handLogId: 'hand-2',
      },
    });

    expect(mocks.mockFindAnalysisEntryByHandLog.mock.calls.length).toBe(callsBeforeRerender);
    expect(result.current.hasDraftChanges).toBe(true);
    expect(mocks.mockFindAnalysisEntryByHandLog).toHaveBeenCalledTimes(1);
  });

  it('clears the previous entry immediately when switching to a different source', async () => {
    const firstEntry = createAnalysisEntry('entry-1');
    const secondEntry = createAnalysisEntry('entry-2');
    const firstSource: AnalysisSource = {
      kind: 'room' as const,
      roomId: 'room-1',
      handLogId: 'hand-1',
    };
    const secondSource: AnalysisSource = {
      kind: 'competition' as const,
      competitionId: 'competition-1',
      gameResultId: 'game-1',
      handLogId: 'hand-2',
    };

    let resolveSecondEntry: ((entry: typeof secondEntry | null) => void) | undefined;

    mocks.mockFindAnalysisEntryByHandLog.mockImplementation((_uid, source) => {
      if (source.handLogId === 'hand-1') {
        return Promise.resolve(firstEntry);
      }

      return new Promise((resolve) => {
        resolveSecondEntry = resolve;
      });
    });

    const { result, rerender } = renderHook(
      ({ nextSource }: { nextSource: AnalysisSource }) => useAnalysisEntry({ source: nextSource }),
      {
        initialProps: { nextSource: firstSource },
      },
    );

    await waitFor(() => {
      expect(result.current.analysisEntry?.id).toBe('entry-1');
    });

    rerender({ nextSource: secondSource });

    expect(result.current.loading).toBe(true);
    expect(result.current.analysisEntry).toBeNull();
    expect(result.current.draftAnalysisEntry).toBeNull();

    expect(resolveSecondEntry).toBeDefined();
    resolveSecondEntry?.(secondEntry);

    await waitFor(() => {
      expect(result.current.analysisEntry?.id).toBe('entry-2');
    });
  });

  it('deletes the currently loaded entry', async () => {
    const entry = createAnalysisEntry();
    mocks.mockGetAnalysisEntry.mockResolvedValue(entry);

    const { result } = renderHook(() => useAnalysisEntry({ entryId: 'entry-1' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteAnalysisEntry();
    });

    expect(mocks.mockDeleteAnalysisEntry).toHaveBeenCalledWith('user-1', 'entry-1');
    expect(result.current.analysisEntry).toBeNull();
    expect(result.current.draftAnalysisEntry).toBeNull();
  });

  it('clears loaded entry and draft immediately when auth changes to signed out', async () => {
    const entry = createAnalysisEntry();
    mocks.mockGetAnalysisEntry.mockResolvedValue(entry);

    const { result } = renderHook(() => useAnalysisEntry({ entryId: 'entry-1' }));

    await waitFor(() => {
      expect(result.current.analysisEntry).toEqual(entry);
    });

    act(() => {
      result.current.setDraftAnalysisEntry({
        ...entry,
        notes: 'draft note',
      });
    });

    authStateCallback?.(null);

    await waitFor(() => {
      expect(result.current.uid).toBeNull();
    });

    expect(result.current.analysisEntry).toBeNull();
    expect(result.current.draftAnalysisEntry).toBeNull();
    expect(result.current.hasDraftChanges).toBe(false);
  });

  it('reloads before exposing cached entry when the same uid signs in again', async () => {
    const firstEntry = createAnalysisEntry('entry-1');
    const refreshedEntry = createAnalysisEntry('entry-1');
    refreshedEntry.notes = 'reloaded';

    let secondResolve: ((entry: typeof refreshedEntry | null) => void) | undefined;
    mocks.mockGetAnalysisEntry.mockResolvedValueOnce(firstEntry).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          secondResolve = resolve;
        }),
    );

    const { result } = renderHook(() => useAnalysisEntry({ entryId: 'entry-1' }));

    await waitFor(() => {
      expect(result.current.analysisEntry).toEqual(firstEntry);
    });

    act(() => {
      authStateCallback?.(null);
    });

    await waitFor(() => {
      expect(result.current.uid).toBeNull();
    });

    act(() => {
      authStateCallback?.({ uid: 'user-1' });
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.analysisEntry).toBeNull();
    expect(result.current.draftAnalysisEntry).toBeNull();

    secondResolve?.(refreshedEntry);

    await waitFor(() => {
      expect(result.current.analysisEntry).toEqual(refreshedEntry);
    });
  });
});

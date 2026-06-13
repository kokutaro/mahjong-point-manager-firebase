// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalysisEntries } from './useAnalysisEntries';

const mocks = vi.hoisted(() => ({
  mockSubscribeAnalysisEntries: vi.fn(),
  mockUseAuth: vi.fn(),
}));

const createAnalysisEntry = (id: string) => ({
  id,
  uid: 'user-1',
  source: {
    kind: 'room',
    roomId: 'room-1',
    handLogId: `hand-${id}`,
  },
  context: {
    round: {
      wind: 'East',
      number: 1,
      honba: 0,
    },
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
    riichi: 'none',
    special: null,
  },
  notes: '',
  createdAt: 1000,
  updatedAt: 2000,
});

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => mocks.mockUseAuth(),
}));

vi.mock('../services/analysisService', () => ({
  subscribeAnalysisEntries: (...args: unknown[]) => mocks.mockSubscribeAnalysisEntries(...args),
}));

describe('useAnalysisEntries', () => {
  let authState = { authReady: true, sessionId: 1, uid: 'user-1' as string | null };

  beforeEach(() => {
    mocks.mockSubscribeAnalysisEntries.mockReset();
    authState = { authReady: true, sessionId: 1, uid: 'user-1' };
    mocks.mockUseAuth.mockImplementation(() => {
      return authState;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes for the authenticated user and exposes streamed entries', async () => {
    const streamedEntries = [createAnalysisEntry('entry-2'), createAnalysisEntry('entry-1')];

    mocks.mockSubscribeAnalysisEntries.mockImplementation((_uid, callback) => {
      callback(streamedEntries);
      return vi.fn();
    });

    const { result } = renderHook(() => useAnalysisEntries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mocks.mockSubscribeAnalysisEntries).toHaveBeenCalledWith('user-1', expect.any(Function));
    expect(result.current.uid).toBe('user-1');
    expect(result.current.entries).toEqual(streamedEntries);
  });

  it('stays empty when the user is signed out', async () => {
    authState = { authReady: true, sessionId: 2, uid: null };

    const { result } = renderHook(() => useAnalysisEntries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mocks.mockSubscribeAnalysisEntries).not.toHaveBeenCalled();
    expect(result.current.uid).toBeNull();
    expect(result.current.entries).toEqual([]);
  });

  it('clears streamed entries immediately when auth changes to signed out', async () => {
    const streamedEntries = [createAnalysisEntry('entry-1')];
    mocks.mockSubscribeAnalysisEntries.mockImplementation((_uid, callback) => {
      callback(streamedEntries);
      return vi.fn();
    });

    const { result, rerender } = renderHook(() => useAnalysisEntries());

    await waitFor(() => {
      expect(result.current.entries).toEqual(streamedEntries);
    });

    authState = { authReady: true, sessionId: 2, uid: null };
    rerender();

    await waitFor(() => {
      expect(result.current.uid).toBeNull();
    });

    expect(result.current.entries).toEqual([]);
  });
});

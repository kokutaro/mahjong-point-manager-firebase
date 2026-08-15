// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Competition,
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionSeries,
  CompetitionSeriesMember,
  CompetitionSeriesRound,
} from '../types';
import { DEFAULT_COMPETITION_SETTINGS } from '../utils/competitionDefaults';
import { useCompetitionSeries } from './useCompetitionSeries';

const mocks = vi.hoisted(() => ({
  subscribeSeries: vi.fn(),
  subscribeMembers: vi.fn(),
  subscribeRounds: vi.fn(),
  subscribeCompetition: vi.fn(),
  subscribeParticipants: vi.fn(),
  subscribeGameResults: vi.fn(),
}));

vi.mock('../services/competitionSeriesService', () => ({
  subscribeToCompetitionSeries: mocks.subscribeSeries,
  subscribeToCompetitionSeriesMembers: mocks.subscribeMembers,
  subscribeToCompetitionSeriesRounds: mocks.subscribeRounds,
}));

vi.mock('../services/competitionService', () => ({
  subscribeToCompetition: mocks.subscribeCompetition,
  subscribeToParticipants: mocks.subscribeParticipants,
  subscribeToGameResults: mocks.subscribeGameResults,
}));

const series: CompetitionSeries = {
  id: 'series-1',
  name: '年間リーグ',
  organizerId: 'organizer',
  coOrganizerIds: [],
  createdAt: 1,
  updatedAt: 1,
};

const members: CompetitionSeriesMember[] = [
  { id: 'member-1', name: '雀太郎', active: true, joinedAt: 1 },
];

const round: CompetitionSeriesRound = {
  id: '1',
  competitionId: 'competition-1',
  roundNumber: 1,
  linkedAt: 1,
};

const competition: Competition = {
  id: 'competition-1',
  name: '第1回',
  organizerId: 'organizer',
  coOrganizerIds: [],
  status: 'closed',
  hasPasscode: false,
  settings: DEFAULT_COMPETITION_SETTINGS,
  createdAt: 1,
};

describe('useCompetitionSeries', () => {
  let competitionListener: ((value: Competition | null) => void) | undefined;
  let participantListener: ((value: CompetitionParticipant[]) => void) | undefined;
  let resultListener: ((value: CompetitionGameResult[]) => void) | undefined;

  beforeEach(() => {
    const unsubscribe = vi.fn();
    mocks.subscribeSeries.mockImplementation((_id, callback) => {
      callback(series);
      return unsubscribe;
    });
    mocks.subscribeMembers.mockImplementation((_id, callback) => {
      callback(members);
      return unsubscribe;
    });
    mocks.subscribeRounds.mockImplementation((_id, callback) => {
      callback([round]);
      return unsubscribe;
    });
    mocks.subscribeCompetition.mockImplementation((_id, callback) => {
      competitionListener = callback;
      return unsubscribe;
    });
    mocks.subscribeParticipants.mockImplementation((_id, callback) => {
      participantListener = callback;
      return unsubscribe;
    });
    mocks.subscribeGameResults.mockImplementation((_id, callback) => {
      resultListener = callback;
      return unsubscribe;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps round details loading until every linked subscription responds', async () => {
    const { result } = renderHook(() => useCompetitionSeries('series-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roundDetailsLoading).toBe(true);

    act(() => competitionListener?.(competition));
    expect(result.current.roundDetailsLoading).toBe(true);

    act(() => participantListener?.([]));
    expect(result.current.roundDetailsLoading).toBe(true);

    act(() => resultListener?.([]));
    expect(result.current.roundDetailsLoading).toBe(false);
  });

  it('does not wait for round details when the series has no linked rounds', async () => {
    mocks.subscribeRounds.mockImplementation((_id, callback) => {
      callback([]);
      return vi.fn();
    });

    const { result } = renderHook(() => useCompetitionSeries('series-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roundDetailsLoading).toBe(false);
  });
});

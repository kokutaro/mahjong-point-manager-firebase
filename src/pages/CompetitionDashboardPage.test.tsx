// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Competition,
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionTable,
} from '../types';
import { DEFAULT_COMPETITION_SETTINGS } from '../utils/competitionDefaults';
import { CompetitionDashboardPage } from './CompetitionDashboardPage';

const mocks = vi.hoisted(() => ({
  competitionData: null as null | {
    competition: Competition;
    participants: CompetitionParticipant[];
    tables: CompetitionTable[];
    gameResults: CompetitionGameResult[];
    loading: boolean;
  },
  showSnackbar: vi.fn(),
  applyAutoTableAssignment: vi.fn(),
  seriesData: {
    series: null,
    members: [],
    rounds: [],
    loading: false,
  } as Record<string, unknown>,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
  useParams: () => ({ id: 'comp-1' }),
}));

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ uid: 'organizer' }),
}));

vi.mock('../contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: mocks.showSnackbar }),
}));

vi.mock('../hooks/useCompetition', () => ({
  useCompetition: () => mocks.competitionData,
}));

vi.mock('../hooks/useCompetitionSeries', () => ({
  useCompetitionSeries: () => mocks.seriesData,
}));

vi.mock('../services/competitionService', () => ({
  addGuestParticipant: vi.fn(),
  applyAutoTableAssignment: mocks.applyAutoTableAssignment,
  appointCoOrganizer: vi.fn(),
  createTable: vi.fn(),
  removeCoOrganizer: vi.fn(),
  removeParticipant: vi.fn(),
  updateCompetition: vi.fn(),
}));

vi.mock('../components/features/AddGuestModal', () => ({ AddGuestModal: () => null }));
vi.mock('../components/features/CompetitionRuleSettings', () => ({
  CompetitionRuleSettings: () => null,
}));
vi.mock('../components/features/CompetitionStatusBadge', () => ({
  CompetitionStatusBadge: () => null,
}));
vi.mock('../components/features/CreateTableModal', () => ({ CreateTableModal: () => null }));
vi.mock('../components/features/ParticipantList', () => ({ ParticipantList: () => null }));
vi.mock('../components/features/ShareCompetitionModal', () => ({
  ShareCompetitionModal: () => null,
}));
vi.mock('../components/features/TableDetailModal', () => ({ TableDetailModal: () => null }));
vi.mock('../components/features/TableList', () => ({ TableList: () => null }));
vi.mock('../components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));

const makeTable = (rank: 1 | 2): CompetitionTable => ({
  id: 'table-1',
  name: 'A卓',
  rank,
  mode: '4ma',
  status: 'open',
  playerIds: [],
  gameCount: 0,
  createdAt: 1,
});

describe('CompetitionDashboardPage auto assignment', () => {
  beforeEach(() => {
    mocks.competitionData = {
      competition: {
        id: 'comp-1',
        name: 'テスト大会',
        organizerId: 'organizer',
        coOrganizerIds: [],
        status: 'in_progress',
        hasPasscode: false,
        settings: DEFAULT_COMPETITION_SETTINGS,
        createdAt: 1,
      },
      participants: [
        {
          id: 'p1',
          name: '選手1',
          isGuest: true,
          status: 'idle',
          role: 'player',
          joinedAt: 1,
        },
      ],
      tables: [makeTable(1)],
      gameResults: [],
      loading: false,
    };
    mocks.applyAutoTableAssignment.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('requires another confirmation when tournament data changed during review', async () => {
    const { rerender } = render(<CompetitionDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: '自動アサイン' }));
    expect(screen.getByText('ランク1')).not.toBeNull();

    mocks.competitionData = {
      ...mocks.competitionData!,
      tables: [makeTable(2)],
    };
    rerender(<CompetitionDashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: 'アサインする' }));

    await waitFor(() => expect(screen.getByText('ランク2')).not.toBeNull());
    expect(mocks.applyAutoTableAssignment).not.toHaveBeenCalled();
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      '大会の状況が変わったため、割当案を更新しました。もう一度確認してください',
    );

    fireEvent.click(screen.getByRole('button', { name: 'アサインする' }));

    await waitFor(() => expect(mocks.applyAutoTableAssignment).toHaveBeenCalledTimes(1));
  });

  it('offers previous series standings only for the first assignment of a linked competition', () => {
    mocks.competitionData = {
      ...mocks.competitionData!,
      competition: {
        ...mocks.competitionData!.competition,
        seriesId: 'series-1',
        seriesRoundNumber: 2,
      },
      participants: [
        {
          ...mocks.competitionData!.participants[0],
          seriesMemberId: 'member-1',
        },
      ],
    };
    mocks.seriesData = {
      series: {
        id: 'series-1',
        name: '年間リーグ',
        organizerId: 'organizer',
        coOrganizerIds: [],
        createdAt: 1,
        updatedAt: 1,
      },
      members: [{ id: 'member-1', name: '選手1', active: true, joinedAt: 1 }],
      rounds: [
        {
          round: { id: '1', competitionId: 'past', roundNumber: 1, linkedAt: 1 },
          competition: {
            ...mocks.competitionData!.competition,
            id: 'past',
            name: '第1回',
            seriesId: 'series-1',
            seriesRoundNumber: 1,
          },
          participants: [
            {
              id: 'past-player',
              name: '選手1',
              seriesMemberId: 'member-1',
              isGuest: true,
              status: 'idle',
              role: 'player',
              joinedAt: 1,
            },
          ],
          gameResults: [
            {
              id: 'past-result',
              tableId: 'past-table',
              tableName: '過去卓',
              gameIndex: 1,
              participantIds: ['past-player'],
              timestamp: 1,
              result: {
                id: 'past-game',
                timestamp: 1,
                ruleSnapshot: DEFAULT_COMPETITION_SETTINGS,
                scores: [
                  {
                    playerId: 'past-player',
                    name: '選手1',
                    rawScore: 35000,
                    point: 20,
                    rank: 1,
                    chipDiff: 0,
                  },
                ],
              },
            },
          ],
        },
      ],
      loading: false,
    };

    render(<CompetitionDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: 'シリーズ成績で自動アサイン' }));
    expect(screen.getByText(/前回までのシリーズ総合成績/)).not.toBeNull();
  });
});

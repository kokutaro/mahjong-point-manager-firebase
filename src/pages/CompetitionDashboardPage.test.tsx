// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Competition, CompetitionParticipant, CompetitionTable } from '../types';
import { DEFAULT_COMPETITION_SETTINGS } from '../utils/competitionDefaults';
import { CompetitionDashboardPage } from './CompetitionDashboardPage';

const mocks = vi.hoisted(() => ({
  competitionData: null as null | {
    competition: Competition;
    participants: CompetitionParticipant[];
    tables: CompetitionTable[];
    gameResults: [];
    loading: boolean;
  },
  showSnackbar: vi.fn(),
  applyAutoTableAssignment: vi.fn(),
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
});

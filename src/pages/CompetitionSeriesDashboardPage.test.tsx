// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import { CompetitionSeriesDashboardPage } from './CompetitionSeriesDashboardPage';

interface MockRoundView {
  round: CompetitionSeriesRound;
  competition: Competition | null;
  participants: CompetitionParticipant[];
  gameResults: CompetitionGameResult[];
}

interface MockSeriesHookData {
  series: CompetitionSeries | null;
  members: CompetitionSeriesMember[];
  rounds: MockRoundView[];
  loading: boolean;
}

const mocks = vi.hoisted(() => ({
  addMember: vi.fn(),
  addMembersToCompetition: vi.fn(),
  linkCompetition: vi.fn(),
  linkParticipant: vi.fn(),
  importParticipants: vi.fn(),
  updateMember: vi.fn(),
  showSnackbar: vi.fn(),
  hookData: {} as MockSeriesHookData,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useParams: () => ({ seriesId: 'series-1' }),
}));

vi.mock('../contexts/useAuth', () => ({ useAuth: () => ({ uid: 'organizer' }) }));
vi.mock('../contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showSnackbar: mocks.showSnackbar }),
}));
vi.mock('../hooks/useCompetitionSeries', () => ({
  useCompetitionSeries: () => mocks.hookData,
}));
vi.mock('../services/competitionSeriesService', () => ({
  addCompetitionSeriesMember: mocks.addMember,
  addSeriesMembersToCompetition: mocks.addMembersToCompetition,
  importCompetitionParticipantsToSeries: mocks.importParticipants,
  linkCompetitionParticipantToSeriesMember: mocks.linkParticipant,
  linkCompetitionToSeries: mocks.linkCompetition,
  unlinkCompetitionFromSeries: vi.fn(),
  updateCompetitionSeriesMember: mocks.updateMember,
}));
vi.mock('../utils/id', () => ({ generateId: () => 'new-member-id' }));
vi.mock('../components/features/ShareCompetitionSeriesModal', () => ({
  ShareCompetitionSeriesModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>シリーズ共有モーダル</div> : null,
}));

const series: CompetitionSeries = {
  id: 'series-1',
  name: '年間リーグ',
  organizerId: 'organizer',
  coOrganizerIds: [],
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  createdAt: 1,
  updatedAt: 1,
};

const members: CompetitionSeriesMember[] = [
  { id: 'member-a', name: '雀太郎', active: true, joinedAt: 1 },
  { id: 'member-b', name: '麻子', active: true, joinedAt: 2 },
];

const competition: Competition = {
  id: 'competition-1',
  name: '春季戦',
  organizerId: 'organizer',
  coOrganizerIds: [],
  status: 'recruiting',
  hasPasscode: false,
  settings: DEFAULT_COMPETITION_SETTINGS,
  createdAt: 1,
  seriesId: 'series-1',
  seriesRoundNumber: 1,
};

const round: CompetitionSeriesRound = {
  id: '1',
  competitionId: 'competition-1',
  roundNumber: 1,
  linkedAt: 1,
};

describe('CompetitionSeriesDashboardPage', () => {
  beforeEach(() => {
    mocks.hookData = {
      series,
      members,
      rounds: [
        {
          round,
          competition,
          participants: [
            {
              id: 'legacy-player',
              name: '旧ID選手',
              isGuest: true,
              status: 'idle',
              role: 'player',
              joinedAt: 1,
            },
          ],
          gameResults: [],
        },
      ],
      loading: false,
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('manages members, round linking, attendance, and participant identity mapping', async () => {
    render(<CompetitionSeriesDashboardPage />);

    expect(screen.getByRole('heading', { name: '年間リーグ' })).not.toBeNull();
    expect(screen.getByText('2026/01/01 〜 2026/12/31')).not.toBeNull();
    expect(screen.getByText('第1回')).not.toBeNull();
    expect(screen.getByText('春季戦')).not.toBeNull();
    expect(screen.getByText('旧ID選手（未紐付け）')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('シリーズ参加者名'), {
      target: { value: ' 新参加者 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'メンバーを追加' }));
    await waitFor(() =>
      expect(mocks.addMember).toHaveBeenCalledWith(
        'series-1',
        expect.objectContaining({ id: 'new-member-id', name: '新参加者', active: true }),
      ),
    );

    fireEvent.change(screen.getByLabelText('既存大会ID'), {
      target: { value: 'competition-old' },
    });
    fireEvent.change(screen.getByLabelText('回番号'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '既存大会を紐付け' }));
    await waitFor(() =>
      expect(mocks.linkCompetition).toHaveBeenCalledWith('series-1', 'competition-old', 2),
    );

    fireEvent.change(screen.getByLabelText('旧ID選手の紐付け先'), {
      target: { value: 'member-a' },
    });
    await waitFor(() =>
      expect(mocks.linkParticipant).toHaveBeenCalledWith(
        'competition-1',
        'legacy-player',
        'member-a',
        ['legacy-player'],
      ),
    );

    fireEvent.click(screen.getByLabelText('麻子を第1回へ追加'));
    fireEvent.click(screen.getByRole('button', { name: '選択したメンバーを追加' }));
    await waitFor(() =>
      expect(mocks.addMembersToCompetition).toHaveBeenCalledWith('competition-1', [members[1]]),
    );
  });

  it('shows cross-round standings and round breakdown', () => {
    mocks.hookData = {
      ...mocks.hookData,
      rounds: [
        {
          ...mocks.hookData.rounds[0],
          participants: [
            {
              id: 'p1',
              name: '雀太郎',
              seriesMemberId: 'member-a',
              isGuest: true,
              status: 'idle',
              role: 'player',
              joinedAt: 1,
            },
          ],
          gameResults: [
            {
              id: 'result-1',
              tableId: 'table-1',
              tableName: 'A卓',
              gameIndex: 1,
              participantIds: ['p1'],
              timestamp: 1,
              result: {
                id: 'game-1',
                timestamp: 1,
                ruleSnapshot:
                  DEFAULT_COMPETITION_SETTINGS as unknown as CompetitionGameResult['result']['ruleSnapshot'],
                scores: [
                  {
                    playerId: 'p1',
                    name: '雀太郎',
                    rawScore: 35000,
                    point: 10,
                    rank: 1,
                    chipDiff: 2,
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    render(<CompetitionSeriesDashboardPage />);

    expect(screen.getByText('+10.0')).not.toBeNull();
    expect(screen.getByText('1.0')).not.toBeNull();
    expect(screen.getByText('第1回 +10.0')).not.toBeNull();
  });

  it('links to the series report from the dashboard header', () => {
    render(<CompetitionSeriesDashboardPage />);

    expect(screen.getByRole('link', { name: 'レポート' }).getAttribute('href')).toBe(
      '/competition-series/series-1/report',
    );
  });

  it('shares the join link and bulk imports participants from a linked competition', async () => {
    mocks.importParticipants.mockResolvedValue({
      createdMemberCount: 1,
      mappedParticipantCount: 1,
    });
    render(<CompetitionSeriesDashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: '参加リンク・QR' }));
    expect(screen.getByText('シリーズ共有モーダル')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '大会参加者を一括アサイン' }));
    await waitFor(() =>
      expect(mocks.importParticipants).toHaveBeenCalledWith(
        'series-1',
        'competition-1',
        members,
        mocks.hookData.rounds[0].participants,
      ),
    );
  });
});

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
import { CompetitionSeriesReportPage } from './CompetitionSeriesReportPage';

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
  roundDetailsLoading: boolean;
}

const mocks = vi.hoisted(() => ({
  hookData: {} as MockSeriesHookData,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useParams: () => ({ seriesId: 'series-1' }),
}));

vi.mock('../hooks/useCompetitionSeries', () => ({
  useCompetitionSeries: () => mocks.hookData,
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
  { id: 'member-b', name: '麻子', active: false, joinedAt: 2 },
];

const makeCompetition = (
  id: string,
  name: string,
  status: Competition['status'],
  useChip: boolean,
): Competition => ({
  id,
  name,
  organizerId: 'organizer',
  coOrganizerIds: [],
  status,
  hasPasscode: false,
  settings: { ...DEFAULT_COMPETITION_SETTINGS, useChip },
  createdAt: 1,
  seriesId: 'series-1',
});

const makeParticipant = (
  id: string,
  name: string,
  seriesMemberId?: string,
): CompetitionParticipant => ({
  id,
  name,
  seriesMemberId,
  isGuest: true,
  status: 'idle',
  role: 'player',
  joinedAt: 1,
});

const makeResult = (
  id: string,
  scores: Array<{
    playerId: string;
    name: string;
    point: number;
    rank: number;
    chipDiff?: number;
  }>,
): CompetitionGameResult => ({
  id,
  tableId: `table-${id}`,
  tableName: 'A卓',
  gameIndex: 1,
  participantIds: scores.map((score) => score.playerId),
  timestamp: 1,
  result: {
    id: `game-${id}`,
    timestamp: 1,
    ruleSnapshot:
      DEFAULT_COMPETITION_SETTINGS as unknown as CompetitionGameResult['result']['ruleSnapshot'],
    scores: scores.map((score) => ({
      ...score,
      rawScore: 25000,
      chipDiff: score.chipDiff ?? 0,
    })),
  },
});

const makeRound = (
  roundNumber: number,
  competition: Competition | null,
  participants: CompetitionParticipant[],
  gameResults: CompetitionGameResult[],
): MockRoundView => ({
  round: {
    id: String(roundNumber),
    competitionId: competition?.id ?? `missing-${roundNumber}`,
    roundNumber,
    linkedAt: roundNumber,
  },
  competition,
  participants,
  gameResults,
});

describe('CompetitionSeriesReportPage', () => {
  const print = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('print', print);
    mocks.hookData = {
      series,
      members,
      loading: false,
      roundDetailsLoading: false,
      rounds: [
        makeRound(
          1,
          makeCompetition('competition-1', '春季戦', 'closed', false),
          [makeParticipant('p-a-1', '雀太郎', 'member-a')],
          [makeResult('result-1', [{ playerId: 'p-a-1', name: '雀太郎', point: 20, rank: 1 }])],
        ),
        makeRound(
          2,
          makeCompetition('competition-2', '夏季戦', 'in_progress', true),
          [
            makeParticipant('p-a-2', '旧名', 'member-a'),
            makeParticipant('p-b-2', '麻子', 'member-b'),
          ],
          [
            makeResult('result-2', [
              { playerId: 'p-a-2', name: '旧名', point: -5, rank: 3, chipDiff: -1 },
              { playerId: 'p-b-2', name: '麻子', point: 15, rank: 1, chipDiff: 2 },
            ]),
          ],
        ),
      ],
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows cross-round standings, report metadata, and round breakdown', () => {
    render(<CompetitionSeriesReportPage />);

    expect(screen.getByRole('heading', { name: /年間リーグ シリーズレポート/ })).not.toBeNull();
    expect(screen.getByText('2026/01/01 〜 2026/12/31')).not.toBeNull();
    expect(screen.getByText('2名参加 / 2開催回 / 2対局')).not.toBeNull();
    expect(screen.getByText('途中結果')).not.toBeNull();
    expect(screen.getByText('集計日時', { exact: false })).not.toBeNull();

    const overallSection = screen.getByRole('region', { name: 'シリーズ総合成績' });
    expect(overallSection.textContent).toContain('雀太郎');
    expect(overallSection.textContent).toContain('+15.0');
    expect(overallSection.textContent).toContain('2.0');
    expect(overallSection.textContent).toContain('麻子');

    const breakdownSection = screen.getByRole('region', { name: '開催回別内訳' });
    expect(breakdownSection.textContent).toContain('第1回');
    expect(breakdownSection.textContent).toContain('春季戦');
    expect(breakdownSection.textContent).toContain('第2回');
    expect(breakdownSection.textContent).toContain('夏季戦');
  });

  it('shows chip columns when at least one linked competition uses chips', () => {
    render(<CompetitionSeriesReportPage />);

    expect(screen.getAllByRole('columnheader', { name: 'チップ収支' })).toHaveLength(2);
  });

  it('hides chip columns when no linked competition uses chips', () => {
    mocks.hookData = {
      ...mocks.hookData,
      rounds: mocks.hookData.rounds.map((item) => ({
        ...item,
        competition: item.competition
          ? {
              ...item.competition,
              settings: { ...item.competition.settings, useChip: false },
            }
          : null,
      })),
    };

    render(<CompetitionSeriesReportPage />);

    expect(screen.queryByRole('columnheader', { name: 'チップ収支' })).toBeNull();
  });

  it('opens the browser print dialog when the complete report has results', () => {
    render(<CompetitionSeriesReportPage />);

    fireEvent.click(screen.getByRole('button', { name: 'PDF（印刷）' }));

    expect(print).toHaveBeenCalledTimes(1);
  });

  it('disables PDF output when there are no game results', () => {
    mocks.hookData = {
      ...mocks.hookData,
      rounds: mocks.hookData.rounds.map((item) => ({ ...item, gameResults: [] })),
    };

    render(<CompetitionSeriesReportPage />);

    expect(screen.getByText('対局結果がまだありません')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'PDF（印刷）' }).hasAttribute('disabled')).toBe(true);
  });

  it('lists unlinked participants and disables incomplete PDF output', () => {
    mocks.hookData = {
      ...mocks.hookData,
      rounds: [
        makeRound(
          1,
          makeCompetition('competition-1', '春季戦', 'closed', false),
          [makeParticipant('unlinked', '未連携選手')],
          [
            makeResult('unlinked-result', [
              { playerId: 'unlinked', name: '未連携選手', point: 10, rank: 1 },
            ]),
          ],
        ),
      ],
    };

    render(<CompetitionSeriesReportPage />);

    const warning = screen.getByRole('alert');
    expect(warning.textContent).toContain('第1回 春季戦: 未連携選手');
    expect(warning.textContent).toContain('名寄せ');
    expect(screen.getByRole('button', { name: 'PDF（印刷）' }).hasAttribute('disabled')).toBe(true);
  });

  it('reports an unavailable linked competition and disables PDF output', () => {
    mocks.hookData = {
      ...mocks.hookData,
      rounds: [...mocks.hookData.rounds, makeRound(3, null, [], [])],
    };

    render(<CompetitionSeriesReportPage />);

    expect(screen.getByRole('alert').textContent).toContain('第3回の大会データを取得できません');
    expect(screen.getByRole('button', { name: 'PDF（印刷）' }).hasAttribute('disabled')).toBe(true);
  });

  it('keeps the report in a loading state until linked round details are loaded', () => {
    mocks.hookData = { ...mocks.hookData, roundDetailsLoading: true };

    render(<CompetitionSeriesReportPage />);

    expect(screen.getByText('読み込み中...')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'PDF（印刷）' })).toBeNull();
  });

  it('shows a not-found state for an unavailable series', () => {
    mocks.hookData = { ...mocks.hookData, series: null };

    render(<CompetitionSeriesReportPage />);

    expect(screen.getByText('大会シリーズが見つかりません')).not.toBeNull();
  });
});

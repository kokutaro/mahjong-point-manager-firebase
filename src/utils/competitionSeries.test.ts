import { describe, expect, it } from 'vitest';
import type {
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionSeriesMember,
  GameResult,
  PlayerGameResult,
} from '../types';
import {
  aggregateCompetitionSeriesStandings,
  buildCompetitionParticipantImportPlan,
} from './competitionSeries';

const makeMember = (
  id: string,
  overrides: Partial<CompetitionSeriesMember> = {},
): CompetitionSeriesMember => ({
  id,
  name: id,
  active: true,
  joinedAt: 1,
  ...overrides,
});

const makeParticipant = (
  id: string,
  seriesMemberId?: string,
  userId?: string,
): CompetitionParticipant => ({
  id,
  name: id,
  userId,
  seriesMemberId,
  isGuest: !userId,
  status: 'idle',
  role: 'player',
  joinedAt: 1,
});

const makeScore = (
  playerId: string,
  point: number,
  rank: number,
  chipDiff = 0,
): PlayerGameResult => ({
  playerId,
  name: playerId,
  rawScore: 25000,
  point,
  rank,
  chipDiff,
});

const makeResult = (
  id: string,
  scores: PlayerGameResult[],
  participantIds: string[],
): CompetitionGameResult => ({
  id,
  tableId: `table-${id}`,
  tableName: 'A卓',
  gameIndex: 1,
  participantIds,
  timestamp: 1,
  result: {
    id,
    timestamp: 1,
    ruleSnapshot: {} as GameResult['ruleSnapshot'],
    scores,
  },
});

describe('aggregateCompetitionSeriesStandings', () => {
  it('combines different participant and user ids through a stable series member id', () => {
    const members = [makeMember('member-1', { name: '雀太郎' })];
    const result = aggregateCompetitionSeriesStandings(members, [
      {
        competitionId: 'competition-1',
        competitionName: '第1回',
        roundNumber: 1,
        participants: [makeParticipant('old-participant', 'member-1')],
        gameResults: [
          makeResult('game-1', [makeScore('old-participant', 25, 1, 2)], ['old-participant']),
        ],
      },
      {
        competitionId: 'competition-2',
        competitionName: '第2回',
        roundNumber: 2,
        participants: [makeParticipant('new-participant', 'member-1', 'new-user-id')],
        gameResults: [
          makeResult('game-2', [makeScore('new-user-id', -5, 3, -1)], ['new-participant']),
        ],
      },
    ]);

    expect(result.standings).toEqual([
      expect.objectContaining({
        rank: 1,
        seriesMemberId: 'member-1',
        name: '雀太郎',
        totalPoint: 20,
        totalChip: 1,
        gameCount: 2,
        averageRank: 2,
        appearanceCount: 2,
      }),
    ]);
    expect(result.standings[0].rounds).toEqual([
      expect.objectContaining({ roundNumber: 1, totalPoint: 25 }),
      expect.objectContaining({ roundNumber: 2, totalPoint: -5 }),
    ]);
  });

  it('reports participants with results that have not been linked to a series member', () => {
    const result = aggregateCompetitionSeriesStandings(
      [makeMember('member-1')],
      [
        {
          competitionId: 'competition-1',
          competitionName: '第1回',
          roundNumber: 1,
          participants: [makeParticipant('unlinked')],
          gameResults: [makeResult('game-1', [makeScore('unlinked', 10, 1)], ['unlinked'])],
        },
      ],
    );

    expect(result.standings).toEqual([]);
    expect(result.unlinkedParticipants).toEqual([
      {
        competitionId: 'competition-1',
        competitionName: '第1回',
        roundNumber: 1,
        participantId: 'unlinked',
        name: 'unlinked',
      },
    ]);
  });

  it('uses average rank, joined time, and member id as deterministic tie breakers', () => {
    const members = [
      makeMember('member-c', { joinedAt: 2 }),
      makeMember('member-b', { joinedAt: 1 }),
      makeMember('member-a', { joinedAt: 1 }),
    ];
    const participants = members.map((member) => makeParticipant(`p-${member.id}`, member.id));
    const scores = [
      makeScore('p-member-c', 10, 1),
      makeScore('p-member-b', 10, 2),
      makeScore('p-member-a', 10, 2),
    ];

    const result = aggregateCompetitionSeriesStandings(members, [
      {
        competitionId: 'competition-1',
        competitionName: '第1回',
        roundNumber: 1,
        participants,
        gameResults: [
          makeResult(
            'game-1',
            scores,
            participants.map((p) => p.id),
          ),
        ],
      },
    ]);

    expect(result.standings.map((standing) => standing.seriesMemberId)).toEqual([
      'member-c',
      'member-a',
      'member-b',
    ]);
  });
});

describe('buildCompetitionParticipantImportPlan', () => {
  it('matches by user id, then unique name, and creates members for unmatched participants', () => {
    const members = [
      makeMember('member-user', { name: '以前の名前', userId: 'user-1' }),
      makeMember('member-name', { name: '麻子' }),
      makeMember('member-linked', { name: '紐付け済み' }),
    ];
    const participants = [
      { ...makeParticipant('participant-user', undefined, 'user-1'), name: '現在の名前' },
      { ...makeParticipant('participant-name'), name: ' 麻子 ' },
      { ...makeParticipant('participant-new', undefined, 'user-3'), name: '新参加者' },
      makeParticipant('participant-linked', 'member-linked'),
    ];

    const plan = buildCompetitionParticipantImportPlan(members, participants, () => 'member-new');

    expect(plan.newMembers).toEqual([
      {
        id: 'member-new',
        userId: 'user-3',
        name: '新参加者',
        active: true,
      },
    ]);
    expect(plan.mappings).toEqual([
      { participantId: 'participant-user', seriesMemberId: 'member-user' },
      { participantId: 'participant-name', seriesMemberId: 'member-name' },
      { participantId: 'participant-new', seriesMemberId: 'member-new' },
    ]);
    expect(plan.skippedParticipantIds).toEqual(['participant-linked']);
  });

  it('does not merge two same-name competition participants into one series member', () => {
    const plan = buildCompetitionParticipantImportPlan(
      [makeMember('existing', { name: '同名選手' })],
      [
        { ...makeParticipant('participant-1'), name: '同名選手' },
        { ...makeParticipant('participant-2'), name: '同名選手' },
      ],
      () => 'separate-member',
    );

    expect(plan.mappings).toEqual([
      { participantId: 'participant-1', seriesMemberId: 'existing' },
      { participantId: 'participant-2', seriesMemberId: 'separate-member' },
    ]);
    expect(plan.newMembers).toEqual([
      expect.objectContaining({ id: 'separate-member', name: '同名選手' }),
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import type {
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionTable,
  GameResult,
  PlayerGameResult,
} from '../types';
import {
  areAutoTableAssignmentProposalsEqual,
  buildAutoTableAssignment,
} from './autoTableAssignment';

const makeParticipant = (
  id: string,
  overrides: Partial<CompetitionParticipant> = {},
): CompetitionParticipant => ({
  id,
  name: id,
  isGuest: true,
  status: 'idle',
  role: 'player',
  joinedAt: 1,
  ...overrides,
});

const makeTable = (
  id: string,
  rank: 1 | 2 | 3 | 4 | 5,
  overrides: Partial<CompetitionTable> = {},
): CompetitionTable => ({
  id,
  name: `${id}卓`,
  rank,
  mode: '4ma',
  status: 'open',
  playerIds: [],
  gameCount: 0,
  createdAt: rank,
  ...overrides,
});

const makeScore = (playerId: string, point: number, rank: number): PlayerGameResult => ({
  playerId,
  name: playerId,
  rawScore: 25000,
  point,
  rank,
  chipDiff: 0,
});

const makeResult = (
  id: string,
  scores: PlayerGameResult[],
  participantIds = scores.map((score) => score.playerId),
): CompetitionGameResult => ({
  id,
  tableId: 'past-table',
  tableName: '過去卓',
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

describe('buildAutoTableAssignment', () => {
  it('assigns stronger participants to higher-ranked tables using total point then average rank', () => {
    const participants = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => makeParticipant(id));
    const results = [
      makeResult('g1', [
        makeScore('p1', 40, 2),
        makeScore('p2', 40, 1),
        makeScore('p3', 20, 1),
        makeScore('p4', 10, 2),
        makeScore('p5', -10, 3),
      ]),
    ];

    const proposal = buildAutoTableAssignment(
      [makeTable('low', 3, { mode: '3ma' }), makeTable('high', 1, { mode: '3ma' })],
      participants,
      results,
    );

    expect(proposal.tables.map((table) => table.tableId)).toEqual(['high', 'low']);
    expect(proposal.tables[0].participants.map((participant) => participant.id)).toEqual([
      'p2',
      'p1',
      'p3',
    ]);
    expect(proposal.tables[1].participants.map((participant) => participant.id)).toEqual([
      'p4',
      'p6',
      'p5',
    ]);
    expect(proposal.tables[0].participants[0]).toEqual(
      expect.objectContaining({ totalPoint: 40, averageRank: 1, gameCount: 1 }),
    );
  });

  it('keeps existing manual assignments and only fills remaining seats with idle participants', () => {
    const participants = [
      makeParticipant('manual', { status: 'assigned', currentTableId: 'high' }),
      makeParticipant('idle-1'),
      makeParticipant('idle-2'),
      makeParticipant('playing', { status: 'playing', currentTableId: 'playing-table' }),
    ];

    const proposal = buildAutoTableAssignment(
      [
        makeTable('high', 1, { mode: '3ma', playerIds: ['manual'] }),
        makeTable('playing-table', 1, { status: 'playing', playerIds: ['playing'] }),
      ],
      participants,
      [],
    );

    expect(proposal.tables).toHaveLength(1);
    expect(proposal.tables[0].existingParticipants).toEqual([{ id: 'manual', name: 'manual' }]);
    expect(proposal.tables[0].participants.map((participant) => participant.id)).toEqual([
      'idle-1',
      'idle-2',
    ]);
    expect(proposal.assignmentCount).toBe(2);
  });

  it('treats no-result participants as zero points with no average rank', () => {
    const participants = [makeParticipant('new'), makeParticipant('negative')];
    const results = [makeResult('g1', [makeScore('negative', -100, 4)])];

    const proposal = buildAutoTableAssignment(
      [makeTable('high', 1, { mode: '3ma' })],
      participants,
      results,
    );

    expect(proposal.tables[0].participants.map((participant) => participant.id)).toEqual([
      'new',
      'negative',
    ]);
    expect(proposal.tables[0].participants[0].averageRank).toBeNull();
  });

  it('uses joined time and participant id as deterministic tie breakers', () => {
    const participants = [
      makeParticipant('p3', { joinedAt: 2 }),
      makeParticipant('p2', { joinedAt: 1 }),
      makeParticipant('p1', { joinedAt: 1 }),
    ];

    const proposal = buildAutoTableAssignment(
      [makeTable('high', 1, { mode: '3ma' })],
      participants,
      [],
    );

    expect(proposal.tables[0].participants.map((participant) => participant.id)).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('supports account user ids in historical result scores', () => {
    const participants = [
      makeParticipant('participant-1', { userId: 'uid-1' }),
      makeParticipant('participant-2'),
    ];
    const results = [makeResult('g1', [makeScore('uid-1', 25, 1)], ['participant-1'])];

    const proposal = buildAutoTableAssignment(
      [makeTable('high', 1, { mode: '3ma' })],
      participants,
      results,
    );

    expect(proposal.tables[0].participants[0]).toEqual(
      expect.objectContaining({ id: 'participant-1', totalPoint: 25 }),
    );
  });

  it('uses linked series standings for an initial assignment when explicitly requested', () => {
    const participants = [
      makeParticipant('current-a', { seriesMemberId: 'member-a' }),
      makeParticipant('current-b', { seriesMemberId: 'member-b' }),
      makeParticipant('unlinked'),
    ];

    const proposal = buildAutoTableAssignment(
      [makeTable('high', 1, { mode: '3ma' })],
      participants,
      [],
      {
        source: 'series',
        standings: [
          { seriesMemberId: 'member-b', gameCount: 3, totalPoint: 50, averageRank: 1.7 },
          { seriesMemberId: 'member-a', gameCount: 2, totalPoint: -10, averageRank: 2.5 },
        ],
      },
    );

    expect(proposal.standingSource).toBe('series');
    expect(proposal.tables[0].participants.map((participant) => participant.id)).toEqual([
      'current-b',
      'unlinked',
      'current-a',
    ]);
    expect(proposal.tables[0].participants[0]).toEqual(
      expect.objectContaining({ gameCount: 3, totalPoint: 50, averageRank: 1.7 }),
    );
  });

  it('falls back to competition results once the current competition has started', () => {
    const participants = [
      makeParticipant('current-a', { seriesMemberId: 'member-a' }),
      makeParticipant('current-b', { seriesMemberId: 'member-b' }),
    ];

    const proposal = buildAutoTableAssignment(
      [makeTable('high', 1, { mode: '3ma' })],
      participants,
      [makeResult('current-game', [makeScore('current-a', 20, 1)])],
      {
        source: 'series',
        standings: [{ seriesMemberId: 'member-b', gameCount: 3, totalPoint: 50, averageRank: 1.7 }],
      },
    );

    expect(proposal.standingSource).toBe('competition');
    expect(proposal.tables[0].participants[0].id).toBe('current-a');
  });

  it('treats legacy tables without a rank as rank 1 and reports overflow participants', () => {
    const legacyTable = makeTable('legacy', 1, { mode: '3ma' });
    delete legacyTable.rank;
    const participants = ['p1', 'p2', 'p3', 'p4'].map((id) => makeParticipant(id));

    const proposal = buildAutoTableAssignment([legacyTable], participants, []);

    expect(proposal.tables[0].rank).toBe(1);
    expect(proposal.unassignedParticipantIds).toEqual(['p4']);
  });

  it('returns no proposal for full or finished tables', () => {
    const participants = [makeParticipant('p1')];

    const proposal = buildAutoTableAssignment(
      [
        makeTable('full', 1, { playerIds: ['a', 'b', 'c', 'd'], status: 'ready' }),
        makeTable('finished', 2, { status: 'finished' }),
      ],
      participants,
      [],
    );

    expect(proposal.tables).toEqual([]);
    expect(proposal.assignmentCount).toBe(0);
    expect(proposal.unassignedParticipantIds).toEqual(['p1']);
  });

  it('detects whether the proposal changed while it was being reviewed', () => {
    const participants = [makeParticipant('p1')];
    const first = buildAutoTableAssignment([makeTable('table-1', 1)], participants, []);
    const same = buildAutoTableAssignment([makeTable('table-1', 1)], participants, []);
    const changedRank = buildAutoTableAssignment([makeTable('table-1', 2)], participants, []);
    const changedMode = buildAutoTableAssignment(
      [makeTable('table-1', 1, { mode: '3ma' })],
      participants,
      [],
    );

    expect(areAutoTableAssignmentProposalsEqual(first, same)).toBe(true);
    expect(areAutoTableAssignmentProposalsEqual(first, changedRank)).toBe(false);
    expect(areAutoTableAssignmentProposalsEqual(first, changedMode)).toBe(false);
  });
});

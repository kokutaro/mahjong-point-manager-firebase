import { describe, expect, it } from 'vitest';
import {
  aggregateOverallStandings,
  aggregateMatchDetails,
  aggregateTableSummary,
} from './competitionReport';
import type {
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionTable,
  GameResult,
  PlayerGameResult,
} from '../types';

const makeScore = (overrides: Partial<PlayerGameResult> = {}): PlayerGameResult => ({
  playerId: 'p1',
  name: 'Player 1',
  rank: 1,
  rawScore: 30000,
  point: 20,
  chipDiff: 0,
  ...overrides,
});

const makeGameResult = (overrides: Partial<GameResult> = {}): GameResult => ({
  id: 'game-1',
  timestamp: Date.now(),
  ruleSnapshot: {} as GameResult['ruleSnapshot'],
  scores: [],
  ...overrides,
});

const makeCompGameResult = (
  overrides: Partial<CompetitionGameResult> = {},
): CompetitionGameResult => ({
  id: 'cgr-1',
  tableId: 'table-1',
  tableName: 'A卓',
  gameIndex: 1,
  result: makeGameResult(),
  participantIds: ['p1'],
  timestamp: Date.now(),
  ...overrides,
});

const makeParticipant = (
  overrides: Partial<CompetitionParticipant> = {},
): CompetitionParticipant => ({
  id: 'p1',
  name: 'Player 1',
  isGuest: false,
  status: 'idle',
  role: 'player',
  joinedAt: Date.now(),
  ...overrides,
});

const makeTable = (overrides: Partial<CompetitionTable> = {}): CompetitionTable => ({
  id: 'table-1',
  name: 'A卓',
  mode: '4ma',
  status: 'finished',
  playerIds: ['p1', 'p2', 'p3', 'p4'],
  gameCount: 2,
  createdAt: Date.now(),
  ...overrides,
});

describe('aggregateOverallStandings', () => {
  it('returns empty array when no game results', () => {
    const result = aggregateOverallStandings([], []);
    expect(result).toEqual([]);
  });

  it('aggregates single player across multiple games', () => {
    const gameResults: CompetitionGameResult[] = [
      makeCompGameResult({
        result: makeGameResult({
          scores: [makeScore({ playerId: 'p1', point: 20, rank: 1, chipDiff: 3 })],
        }),
        participantIds: ['p1'],
      }),
      makeCompGameResult({
        id: 'cgr-2',
        result: makeGameResult({
          scores: [makeScore({ playerId: 'p1', point: -10, rank: 3, chipDiff: -1 })],
        }),
        participantIds: ['p1'],
      }),
    ];
    const participants = [makeParticipant({ id: 'p1', name: 'Player 1' })];

    const result = aggregateOverallStandings(gameResults, participants);

    expect(result).toHaveLength(1);
    expect(result[0].participantId).toBe('p1');
    expect(result[0].totalPoint).toBe(10);
    expect(result[0].gameCount).toBe(2);
    expect(result[0].averageRank).toBe(2);
    expect(result[0].totalChip).toBe(2);
    expect(result[0].rank).toBe(1);
  });

  it('ranks players by total point descending', () => {
    const gameResults: CompetitionGameResult[] = [
      makeCompGameResult({
        result: makeGameResult({
          scores: [
            makeScore({ playerId: 'p1', point: 10, rank: 2 }),
            makeScore({ playerId: 'p2', point: 30, rank: 1 }),
            makeScore({ playerId: 'p3', point: -40, rank: 3 }),
          ],
        }),
        participantIds: ['p1', 'p2', 'p3'],
      }),
    ];
    const participants = [
      makeParticipant({ id: 'p1', name: 'P1' }),
      makeParticipant({ id: 'p2', name: 'P2' }),
      makeParticipant({ id: 'p3', name: 'P3' }),
    ];

    const result = aggregateOverallStandings(gameResults, participants);

    expect(result[0].participantId).toBe('p2');
    expect(result[0].rank).toBe(1);
    expect(result[1].participantId).toBe('p1');
    expect(result[1].rank).toBe(2);
    expect(result[2].participantId).toBe('p3');
    expect(result[2].rank).toBe(3);
  });

  it('resolves player name from participants when available', () => {
    const gameResults: CompetitionGameResult[] = [
      makeCompGameResult({
        result: makeGameResult({
          scores: [makeScore({ playerId: 'uid-1', name: 'Display Name', point: 10, rank: 1 })],
        }),
        participantIds: ['p1'],
      }),
    ];
    const participants = [makeParticipant({ id: 'p1', userId: 'uid-1', name: 'Participant Name' })];

    const result = aggregateOverallStandings(gameResults, participants);

    expect(result[0].name).toBe('Participant Name');
    expect(result[0].participantId).toBe('p1');
  });
});

describe('aggregateMatchDetails', () => {
  it('returns empty array when no game results', () => {
    expect(aggregateMatchDetails([], [])).toEqual([]);
  });

  it('flattens game results into per-player rows', () => {
    const gameResults: CompetitionGameResult[] = [
      makeCompGameResult({
        tableName: 'A卓',
        gameIndex: 1,
        result: makeGameResult({
          scores: [
            makeScore({
              playerId: 'p1',
              name: 'P1',
              rank: 1,
              rawScore: 35000,
              point: 30,
              chipDiff: 2,
            }),
            makeScore({
              playerId: 'p2',
              name: 'P2',
              rank: 2,
              rawScore: 25000,
              point: -30,
              chipDiff: -2,
            }),
          ],
        }),
        participantIds: ['p1', 'p2'],
      }),
    ];
    const participants = [
      makeParticipant({ id: 'p1', name: 'P1' }),
      makeParticipant({ id: 'p2', name: 'P2' }),
    ];

    const result = aggregateMatchDetails(gameResults, participants);

    expect(result).toHaveLength(2);
    expect(result[0].tableName).toBe('A卓');
    expect(result[0].gameIndex).toBe(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].rawScore).toBe(35000);
    expect(result[0].point).toBe(30);
    expect(result[0].chipDiff).toBe(2);
  });

  it('re-numbers gameIndex sequentially per table by timestamp', () => {
    const gameResults: CompetitionGameResult[] = [
      makeCompGameResult({
        id: 'cgr-1',
        tableId: 't1',
        tableName: 'A卓',
        gameIndex: 0,
        timestamp: 1000,
        result: makeGameResult({
          scores: [
            makeScore({ playerId: 'p1', name: 'P1', rank: 1 }),
            makeScore({ playerId: 'p2', name: 'P2', rank: 2 }),
          ],
        }),
        participantIds: ['p1', 'p2'],
      }),
      makeCompGameResult({
        id: 'cgr-2',
        tableId: 't1',
        tableName: 'A卓',
        gameIndex: 0,
        timestamp: 2000,
        result: makeGameResult({
          scores: [
            makeScore({ playerId: 'p1', name: 'P1', rank: 2 }),
            makeScore({ playerId: 'p2', name: 'P2', rank: 1 }),
          ],
        }),
        participantIds: ['p1', 'p2'],
      }),
    ];
    const participants = [
      makeParticipant({ id: 'p1', name: 'P1' }),
      makeParticipant({ id: 'p2', name: 'P2' }),
    ];

    const result = aggregateMatchDetails(gameResults, participants);

    expect(result).toHaveLength(4);
    expect(result[0].gameIndex).toBe(1);
    expect(result[1].gameIndex).toBe(1);
    expect(result[2].gameIndex).toBe(2);
    expect(result[3].gameIndex).toBe(2);
  });

  it('numbers gameIndex independently per table', () => {
    const gameResults: CompetitionGameResult[] = [
      makeCompGameResult({
        id: 'cgr-1',
        tableId: 't1',
        tableName: 'A卓',
        gameIndex: 0,
        timestamp: 1000,
        result: makeGameResult({
          scores: [makeScore({ playerId: 'p1', name: 'P1', rank: 1 })],
        }),
        participantIds: ['p1'],
      }),
      makeCompGameResult({
        id: 'cgr-2',
        tableId: 't1',
        tableName: 'A卓',
        gameIndex: 0,
        timestamp: 2000,
        result: makeGameResult({
          scores: [makeScore({ playerId: 'p1', name: 'P1', rank: 1 })],
        }),
        participantIds: ['p1'],
      }),
      makeCompGameResult({
        id: 'cgr-3',
        tableId: 't2',
        tableName: 'B卓',
        gameIndex: 0,
        timestamp: 1500,
        result: makeGameResult({
          scores: [makeScore({ playerId: 'p2', name: 'P2', rank: 1 })],
        }),
        participantIds: ['p2'],
      }),
    ];
    const participants = [
      makeParticipant({ id: 'p1', name: 'P1' }),
      makeParticipant({ id: 'p2', name: 'P2' }),
    ];

    const result = aggregateMatchDetails(gameResults, participants);

    const tableA = result.filter((r) => r.tableName === 'A卓');
    const tableB = result.filter((r) => r.tableName === 'B卓');
    expect(tableA[0].gameIndex).toBe(1);
    expect(tableA[1].gameIndex).toBe(2);
    expect(tableB[0].gameIndex).toBe(1);
  });

  it('groups by tableName across different tableIds (table recreation)', () => {
    const gameResults: CompetitionGameResult[] = [
      makeCompGameResult({
        id: 'cgr-1',
        tableId: 't1',
        tableName: 'A卓',
        gameIndex: 0,
        timestamp: 1000,
        result: makeGameResult({
          scores: [makeScore({ playerId: 'p1', name: 'P1', rank: 1 })],
        }),
        participantIds: ['p1'],
      }),
      makeCompGameResult({
        id: 'cgr-2',
        tableId: 't2',
        tableName: 'A卓',
        gameIndex: 0,
        timestamp: 2000,
        result: makeGameResult({
          scores: [makeScore({ playerId: 'p2', name: 'P2', rank: 1 })],
        }),
        participantIds: ['p2'],
      }),
    ];
    const participants = [
      makeParticipant({ id: 'p1', name: 'P1' }),
      makeParticipant({ id: 'p2', name: 'P2' }),
    ];

    const result = aggregateMatchDetails(gameResults, participants);

    expect(result[0].gameIndex).toBe(1);
    expect(result[1].gameIndex).toBe(2);
  });
});

describe('aggregateTableSummary', () => {
  it('returns empty array when no tables', () => {
    expect(aggregateTableSummary([], [], [])).toEqual([]);
  });

  it('builds summary from tables, participants, and game results', () => {
    const tables = [makeTable({ id: 't1', name: 'A卓', mode: '4ma', gameCount: 3 })];
    const participants = [
      makeParticipant({ id: 'p1', name: 'P1' }),
      makeParticipant({ id: 'p2', name: 'P2' }),
    ];
    const gameResults: CompetitionGameResult[] = [
      makeCompGameResult({ tableId: 't1', participantIds: ['p1', 'p2'] }),
    ];

    const result = aggregateTableSummary(tables, participants, gameResults);

    expect(result).toHaveLength(1);
    expect(result[0].tableName).toBe('A卓');
    expect(result[0].mode).toBe('4ma');
    expect(result[0].gameCount).toBe(3);
    expect(result[0].participantNames).toContain('P1');
    expect(result[0].participantNames).toContain('P2');
  });
});

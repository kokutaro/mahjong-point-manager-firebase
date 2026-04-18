import { describe, expect, it } from 'vitest';
import type {
  CompetitionGameResult,
  CompetitionParticipant,
  GameResult,
  HandLog,
  RoomState,
} from '../types';
import {
  buildCompetitionAnalysisEvents,
  buildRoomAnalysisEvents,
  getTimestampValue,
} from './analysisEvents';

const createWinLog = (overrides: Partial<HandLog> = {}): HandLog => ({
  id: 'hand-win',
  timestamp: 1710000000000,
  round: {
    wind: 'East',
    number: 1,
    honba: 0,
    riichiSticks: 0,
  },
  result: {
    type: 'Win',
    winners: [
      {
        id: 'user-1',
        payment: {
          ron: 7700,
          basePoints: 1920,
          name: '3翻40符',
        },
      },
    ],
    loserId: 'user-2',
    scoreDeltas: {
      'user-1': 7700,
      'user-2': -7700,
      'guest-1': 0,
      'guest-2': 0,
    },
  },
  ...overrides,
});

const createDrawLog = (overrides: Partial<HandLog> = {}): HandLog => ({
  id: 'hand-draw',
  timestamp: 1710000001000,
  round: {
    wind: 'East',
    number: 2,
    honba: 1,
    riichiSticks: 1,
  },
  result: {
    type: 'Draw',
    tenpaiPlayerIds: ['user-1'],
    riichiPlayerIds: ['user-1'],
    scoreDeltas: {
      'user-1': 1500,
      'user-2': -1500,
      'guest-1': 0,
      'guest-2': 0,
    },
  },
  ...overrides,
});

describe('analysisEvents', () => {
  it('builds room events from game results and current logs with matched player snapshots', () => {
    const room: RoomState = {
      id: 'room-1',
      hostId: 'user-1',
      status: 'playing',
      createdAt: 1710000000000,
      round: {
        wind: 'East',
        number: 2,
        honba: 1,
        riichiSticks: 1,
      },
      players: [
        { id: 'user-1', name: 'Alice', score: 25000, isRiichi: false, wind: 'South', chip: 0 },
        { id: 'user-2', name: 'Bob', score: 25000, isRiichi: false, wind: 'West', chip: 0 },
        { id: 'guest-1', name: 'Carol', score: 25000, isRiichi: false, wind: 'North', chip: 0 },
        { id: 'guest-2', name: 'Dave', score: 25000, isRiichi: false, wind: 'East', chip: 0 },
      ],
      playerIds: ['user-1', 'user-2', 'guest-1', 'guest-2'],
      settings: {
        mode: '4ma',
        length: 'Hanchan',
        startPoint: 25000,
        returnPoint: 30000,
        uma: [10, 30],
        hasHonba: true,
        honbaPoints: 300,
        tenpaiRenchan: true,
        useTobi: true,
        useChip: false,
        useOka: true,
        useFuCalculation: true,
        noFuFixedPoints: {
          1: { child: 1000, dealer: 1500 },
          2: { child: 2000, dealer: 3000 },
          3: { child: 4000, dealer: 6000 },
        },
        westExtension: false,
        rate: 0,
      },
      history: [
        {
          id: 'room-1',
          hostId: 'user-1',
          status: 'playing',
          round: { wind: 'East', number: 1, honba: 0, riichiSticks: 0 },
          players: [
            { id: 'user-1', name: 'Alice', score: 25000, isRiichi: false, wind: 'East', chip: 0 },
            { id: 'user-2', name: 'Bob', score: 25000, isRiichi: false, wind: 'South', chip: 0 },
            { id: 'guest-1', name: 'Carol', score: 25000, isRiichi: false, wind: 'West', chip: 0 },
            { id: 'guest-2', name: 'Dave', score: 25000, isRiichi: false, wind: 'North', chip: 0 },
          ],
          playerIds: ['user-1', 'user-2', 'guest-1', 'guest-2'],
          settings: {} as RoomState['settings'],
        },
        {
          id: 'room-1',
          hostId: 'user-1',
          status: 'playing',
          round: { wind: 'East', number: 2, honba: 1, riichiSticks: 1 },
          players: [
            { id: 'user-1', name: 'Alice', score: 25700, isRiichi: false, wind: 'South', chip: 0 },
            { id: 'user-2', name: 'Bob', score: 17300, isRiichi: false, wind: 'West', chip: 0 },
            { id: 'guest-1', name: 'Carol', score: 25000, isRiichi: false, wind: 'North', chip: 0 },
            { id: 'guest-2', name: 'Dave', score: 32000, isRiichi: false, wind: 'East', chip: 0 },
          ],
          playerIds: ['user-1', 'user-2', 'guest-1', 'guest-2'],
          settings: {} as RoomState['settings'],
        },
      ],
      gameResults: [
        {
          id: 'game-1',
          timestamp: 1710000000500,
          ruleSnapshot: {} as GameResult['ruleSnapshot'],
          scores: [],
          logs: [createWinLog()],
        },
      ],
      currentLogs: [createDrawLog()],
    };

    const events = buildRoomAnalysisEvents(room, 'user-1');

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({ roomId: 'room-1', handLogId: 'hand-draw' }),
        eventType: 'tenpai-draw',
        roundLabel: '東2局 1本場',
        locationLabel: '進行中の対局',
        scoreDeltaLabel: '+1,500',
      }),
    );
    expect(events[1]).toEqual(
      expect.objectContaining({
        eventType: 'win',
        roundLabel: '東1局 0本場',
        locationLabel: '第1戦',
      }),
    );
    expect(events[1].players.find((player) => player.id === 'user-1')?.wind).toBe('East');
  });

  it('builds competition events using participant ownership and table labels', () => {
    const participants: CompetitionParticipant[] = [
      {
        id: 'participant-1',
        userId: 'user-1',
        name: 'Alice',
        isGuest: false,
        status: 'idle',
        role: 'player',
        joinedAt: 1710000000000,
      },
      {
        id: 'participant-2',
        userId: 'user-2',
        name: 'Bob',
        isGuest: false,
        status: 'idle',
        role: 'player',
        joinedAt: 1710000000000,
      },
      {
        id: 'participant-3',
        name: 'Carol',
        isGuest: true,
        status: 'idle',
        role: 'player',
        joinedAt: 1710000000000,
      },
    ];
    const gameResults: CompetitionGameResult[] = [
      {
        id: 'competition-result-1',
        tableId: 'table-1',
        tableName: 'A卓',
        gameIndex: 2,
        participantIds: ['participant-1', 'participant-2', 'participant-3'],
        timestamp: 1710000002000,
        result: {
          id: 'game-2',
          timestamp: 1710000002000,
          ruleSnapshot: {} as GameResult['ruleSnapshot'],
          scores: [],
          logs: [
            createWinLog({
              id: 'competition-hand-1',
              result: {
                type: 'Win',
                winners: [
                  {
                    id: 'user-2',
                    payment: {
                      ron: 5200,
                      basePoints: 1300,
                      name: '2翻40符',
                    },
                  },
                ],
                loserId: 'user-1',
                scoreDeltas: {
                  'user-1': -5200,
                  'user-2': 5200,
                  'participant-3': 0,
                },
              },
            }),
          ],
        },
      },
    ];

    const events = buildCompetitionAnalysisEvents(
      'competition-1',
      gameResults,
      participants,
      'user-1',
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        eventType: 'deal-in',
        locationLabel: 'A卓 / 第2戦',
        source: expect.objectContaining({
          kind: 'competition',
          competitionId: 'competition-1',
          gameResultId: 'game-2',
          handLogId: 'competition-hand-1',
        }),
        scoreDeltaLabel: '-5,200',
      }),
    );
  });

  it('normalizes number and Firestore-style timestamps to milliseconds', () => {
    expect(getTimestampValue(1710000000000)).toBe(1710000000000);
    expect(getTimestampValue({ seconds: 1710000000 })).toBe(1710000000000);
    expect(getTimestampValue(undefined)).toBe(0);
  });
});

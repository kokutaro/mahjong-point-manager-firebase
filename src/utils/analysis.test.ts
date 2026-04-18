import { describe, expect, it } from 'vitest';
import type { HandLog, Player } from '../types';
import type { AnalysisSource } from '../types/analysis';
import { createAnalysisEntrySeed, getAnalysisEventType, normalizeAnalysisEntry } from './analysis';

const players: Player[] = [
  { id: 'p1', name: 'Alice', score: 25000, isRiichi: false, wind: 'East', chip: 0 },
  { id: 'p2', name: 'Bob', score: 25000, isRiichi: false, wind: 'South', chip: 0 },
  { id: 'p3', name: 'Carol', score: 25000, isRiichi: false, wind: 'West', chip: 0 },
  { id: 'p4', name: 'Dave', score: 25000, isRiichi: false, wind: 'North', chip: 0 },
];

const roomSource: AnalysisSource = {
  kind: 'room',
  roomId: 'room-1',
  handLogId: 'hand-1',
};

const createWinHandLog = (overrides?: Partial<HandLog>): HandLog => ({
  id: 'hand-1',
  timestamp: 1710000000000,
  round: {
    wind: 'East',
    number: 2,
    honba: 1,
    riichiSticks: 1,
  },
  result: {
    type: 'Win',
    winners: [
      {
        id: 'p2',
        payment: {
          ron: 7700,
          basePoints: 1920,
          name: '3翻40符',
        },
      },
    ],
    loserId: 'p4',
    riichiPlayerIds: ['p2'],
    scoreDeltas: {
      p1: 0,
      p2: 7700,
      p3: 0,
      p4: -7700,
    },
  },
  ...overrides,
});

const createDrawHandLog = (overrides?: Partial<HandLog>): HandLog => ({
  id: 'hand-2',
  timestamp: 1710000005000,
  round: {
    wind: 'South',
    number: 3,
    honba: 0,
    riichiSticks: 0,
  },
  result: {
    type: 'Draw',
    tenpaiPlayerIds: ['p1', 'p3'],
    riichiPlayerIds: ['p1'],
    scoreDeltas: {
      p1: 1500,
      p2: -1500,
      p3: 1500,
      p4: -1500,
    },
  },
  ...overrides,
});

describe('getAnalysisEventType', () => {
  it('returns win when the player is among winners', () => {
    expect(getAnalysisEventType(createWinHandLog(), 'p2')).toBe('win');
  });

  it('returns deal-in when the player is the loser', () => {
    expect(getAnalysisEventType(createWinHandLog(), 'p4')).toBe('deal-in');
  });

  it('returns tenpai-draw when the player was tenpai on draw', () => {
    expect(getAnalysisEventType(createDrawHandLog(), 'p1')).toBe('tenpai-draw');
  });

  it('returns null when the player has no analysable event', () => {
    expect(getAnalysisEventType(createDrawHandLog(), 'p2')).toBeNull();
  });
});

describe('createAnalysisEntrySeed', () => {
  it('creates a winning seed with round, seat, and han/fu defaults', () => {
    const entry = createAnalysisEntrySeed({
      uid: 'user-1',
      handLog: createWinHandLog(),
      playerId: 'p2',
      players,
      source: roomSource,
      now: 1710000010000,
    });

    expect(entry).toEqual({
      id: 'hand-1',
      uid: 'user-1',
      source: roomSource,
      context: {
        round: {
          wind: 'East',
          number: 2,
          honba: 1,
        },
        seatWind: 'South',
        roundWind: 'East',
        eventType: 'win',
        isDealer: false,
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
        riichi: 'normal',
        special: null,
        han: 3,
        fu: 40,
      },
      notes: '',
      createdAt: 1710000010000,
      updatedAt: 1710000010000,
    });
  });

  it('creates a tenpai-draw seed without winning tile or han/fu', () => {
    const handLog = createDrawHandLog();
    const source: AnalysisSource = {
      kind: 'competition',
      competitionId: 'competition-1',
      gameResultId: 'game-1',
      handLogId: handLog.id,
    };

    const entry = createAnalysisEntrySeed({
      uid: 'user-1',
      handLog,
      playerId: 'p1',
      players,
      source,
      now: 1710000020000,
    });

    expect(entry.context).toEqual({
      round: {
        wind: 'South',
        number: 3,
        honba: 0,
      },
      seatWind: 'East',
      roundWind: 'South',
      eventType: 'tenpai-draw',
      isDealer: true,
    });
    expect(entry.hand.winningTile).toBeUndefined();
    expect(entry.yaku.han).toBeUndefined();
    expect(entry.yaku.fu).toBeUndefined();
    expect(entry.yaku.riichi).toBe('normal');
  });
});

describe('normalizeAnalysisEntry', () => {
  it('deduplicates ordered list fields and removes winningTile for draw entries', () => {
    const normalized = normalizeAnalysisEntry({
      ...createAnalysisEntrySeed({
        uid: 'user-1',
        handLog: createDrawHandLog(),
        playerId: 'p1',
        players,
        source: {
          kind: 'room',
          roomId: 'room-1',
          handLogId: 'hand-2',
        },
        now: 1710000020000,
      }),
      hand: {
        concealed: ['1m', '1m'],
        melds: [],
        winningTile: '5m',
        wait: ['kanchan', 'kanchan', 'ryanmen'],
      },
      dora: {
        doraIndicators: ['1p', '1p'],
        uraIndicators: [],
        kanDoraIndicators: [],
        kanUraIndicators: [],
        redFiveCount: -3,
      },
      yaku: {
        list: ['tanyao', 'tanyao'],
        yakuman: ['tenhou', 'tenhou'],
        ippatsu: false,
        riichi: 'normal',
        special: null,
        han: 2.8,
        fu: -20,
      },
      notes: '  test note  ',
    });

    expect(normalized.hand).toEqual({
      concealed: ['1m', '1m'],
      melds: [],
      wait: ['kanchan', 'ryanmen'],
    });
    expect(normalized.dora.redFiveCount).toBe(0);
    expect(normalized.dora.doraIndicators).toEqual(['1p', '1p']);
    expect(normalized.yaku.list).toEqual(['tanyao']);
    expect(normalized.yaku.yakuman).toEqual(['tenhou']);
    expect(normalized.yaku.han).toBe(2);
    expect(normalized.yaku.fu).toBeUndefined();
    expect(normalized.notes).toBe('test note');
  });
});

import { describe, expect, it } from 'vitest';
import type { GameSettings, HandLog, Player } from '../../types';
import {
  calculateFinalScores,
  distributeRemainingRiichiSticks,
  getCurrentPlayerRanks,
  sortPlayersByRank,
} from '../resultCalculator';

describe('calculateFinalScores', () => {
  // Common Mock Data
  const baseSettings: GameSettings = {
    mode: '4ma',
    length: 'Hanchan',
    startPoint: 25000,
    returnPoint: 30000,
    uma: [10, 30],
    hasHonba: true,
    honbaPoints: 300,
    tenpaiRenchan: true,
    useTobi: true,
    useChip: true,
    useOka: true,
    useFuCalculation: true,
    westExtension: false,
    rate: 50,
  };

  const createPlayer = (id: string, score: number, wind: Player['wind']): Player => ({
    id,
    name: id,
    score,
    wind,
    isRiichi: false,
    chip: 0,
  });

  const createWinLog = (winners: string[]): HandLog => ({
    id: `log-${winners.join('-') || 'none'}`,
    timestamp: Date.now(),
    round: {
      wind: 'East',
      number: 1,
      honba: 0,
      riichiSticks: 0,
    },
    result: {
      type: 'Win',
      winners: winners.map((id) => ({
        id,
        payment: {
          basePoints: 0,
          name: 'test',
        },
      })),
      loserId: null,
      scoreDeltas: {},
    },
  });

  it('calculates standard 4ma scores correctly (Top > Return, Others < Return)', () => {
    // A: 40000 (Top)
    // B: 25000 (2nd)
    // C: 20000 (3rd)
    // D: 15000 (4th)
    // Total Raw: 100000. Return 30000 * 4 = 120000. Oka = 20.

    const players = [
      createPlayer('A', 40000, 'South'), // Top
      createPlayer('B', 25000, 'East'), // 2nd (Tie with start? No 25000 < 30000)
      createPlayer('C', 20000, 'West'),
      createPlayer('D', 15000, 'North'),
    ];

    const result = calculateFinalScores(players, baseSettings, 'test-1');
    const sorted = result.scores; // Sorted by rank

    // B (2nd): 25000 < 30000. Ceil(25) = 25. 25 - 30 = -5.
    // C (3rd): 20000 < 30000. Ceil(20) = 20. 20 - 30 = -10.
    // D (4th): 15000 < 30000. Ceil(15) = 15. 15 - 30 = -15.
    // Sum (2..4) = -5 -10 -15 = -30.
    // A (1st): -1 * (-30) = +30.

    // Uma: +30, +10, -10, -30.
    // A Total: 30 + 30 = +60.
    // B Total: -5 + 10 = +5.
    // C Total: -10 - 10 = -20.
    // D Total: -15 - 30 = -45.
    // Check Sum: 60 + 5 - 20 - 45 = 0. OK.

    expect(sorted[0].playerId).toBe('A');
    expect(sorted[0].point).toBe(60);
    expect(sorted[1].playerId).toBe('B');
    expect(sorted[1].point).toBe(5);
    expect(sorted[2].playerId).toBe('C');
    expect(sorted[2].point).toBe(-20);
    expect(sorted[3].playerId).toBe('D');
    expect(sorted[3].point).toBe(-45);
  });

  it('handles tied scores by seating order', () => {
    // Seating order should win ties, regardless of the current wind assignment.

    const players = [
      createPlayer('P1', 25000, 'South'),
      createPlayer('P2', 25000, 'East'),
      createPlayer('P3', 25000, 'North'),
      createPlayer('P4', 25000, 'West'),
    ];

    const result = calculateFinalScores(players, baseSettings, 'test-tie');
    const sorted = result.scores;

    expect(sorted[0].playerId).toBe('P1');
    expect(sorted[1].playerId).toBe('P2');
    expect(sorted[2].playerId).toBe('P3');
    expect(sorted[3].playerId).toBe('P4');
  });

  it('handles rounding logic correctly (Ceil vs Floor)', () => {
    // Edge case testing
    // P = 29900 (< 30000) -> Ceil(29.9) = 30 -> 30-30 = 0
    // P = 30100 (>= 30000) -> Floor(30.1) = 30 -> 30-30 = 0
    // P = 30900 (>= 30000) -> Floor(30.9) = 30 -> 30-30 = 0
    // P = 19100 (< 30000) -> Ceil(19.1) = 20 -> 20-30 = -10

    const players = [
      createPlayer('A', 50000, 'East'), // Top dummy
      createPlayer('B', 29900, 'South'),
      createPlayer('C', 19100, 'West'),
      createPlayer('D', 1000, 'North'), // 1.0 -> 1 -> -29
    ];

    const result = calculateFinalScores(players, baseSettings, 'test-round');
    // B: 29.9 -> 30. Diff 0. Uma +10 -> +10.
    // C: 19.1 -> 20. Diff -10. Uma -10 -> -20.
    // D: 1.0 -> 1. Diff -29. Uma -30 -> -59.
    // Sum 2..4 (Diffs) = 0 - 10 - 29 = -39.
    // A: +39. Uma +30 -> +69.

    const b = result.scores.find((s) => s.playerId === 'B');
    const c = result.scores.find((s) => s.playerId === 'C');

    expect(b?.point).toBe(10);
    expect(c?.point).toBe(-20);
  });
  it('calculates 3ma scores correctly (Rank 1: +High, Rank 2: 0, Rank 3: -High)', () => {
    // 3 Players
    // A: 40000 (1st)
    // B: 30000 (2nd)
    // C: 20000 (3rd)
    // Return: 35000 (Typical 3ma start/return is 35000/35000 or similar, let's use custom settings)

    const settings3ma: GameSettings = {
      ...baseSettings,
      mode: '3ma',
      startPoint: 35000,
      returnPoint: 35000,
      uma: [10, 20], // Low=10 (unused for 3ma?), High=20
    };

    const players = [
      createPlayer('A', 40000, 'East'),
      createPlayer('B', 30000, 'South'),
      createPlayer('C', 20000, 'West'),
    ];

    const result = calculateFinalScores(players, settings3ma, 'test-3ma');
    const sorted = result.scores;

    // Calculation:
    // A (1st): 40000 >= 35000. Floor(40) = 40. 40 - 35 = +5.
    // B (2nd): 30000 < 35000. Ceil(30) = 30. 30 - 35 = -5.
    // C (3rd): 20000 < 35000. Ceil(20) = 20. 20 - 35 = -15.

    // Check Sum (2..3): -5 - 15 = -20.
    // A (1st) from others: -1 * (-20) = +20.
    // Total raw point check: +20 + (-5) + (-15) = 0. Matches. (Note A's +5 base is ignored, calculated from others)

    // Uma (3ma):
    // Rank 1: +High (+20)
    // Rank 2: 0
    // Rank 3: -High (-20)

    // Final Totals:
    // A: +20 (Score) + 20 (Uma) = +40.
    // B: -5 (Score) + 0 (Uma) = -5.
    // C: -15 (Score) - 20 (Uma) = -35.

    expect(sorted[0].playerId).toBe('A');
    expect(sorted[0].point).toBe(40);

    expect(sorted[1].playerId).toBe('B');
    expect(sorted[1].point).toBe(-5);

    expect(sorted[2].playerId).toBe('C');
    expect(sorted[2].point).toBe(-35);
  });

  it('does not add uma in 4ma when uma is set to none [0, 0]', () => {
    const settingsWithoutUma: GameSettings = {
      ...baseSettings,
      uma: [0, 0],
    };

    const players = [
      createPlayer('A', 40000, 'South'),
      createPlayer('B', 25000, 'East'),
      createPlayer('C', 20000, 'West'),
      createPlayer('D', 15000, 'North'),
    ];

    const result = calculateFinalScores(players, settingsWithoutUma, 'test-4ma-no-uma');

    expect(
      result.scores.map((score) => ({
        playerId: score.playerId,
        point: score.point,
      })),
    ).toEqual([
      { playerId: 'A', point: 30 },
      { playerId: 'B', point: -5 },
      { playerId: 'C', point: -10 },
      { playerId: 'D', point: -15 },
    ]);
  });

  it('does not add uma in 3ma when uma is set to none [0, 0]', () => {
    const settingsWithoutUma: GameSettings = {
      ...baseSettings,
      mode: '3ma',
      startPoint: 35000,
      returnPoint: 35000,
      uma: [0, 0],
    };

    const players = [
      createPlayer('A', 40000, 'East'),
      createPlayer('B', 30000, 'South'),
      createPlayer('C', 20000, 'West'),
    ];

    const result = calculateFinalScores(players, settingsWithoutUma, 'test-3ma-no-uma');

    expect(
      result.scores.map((score) => ({
        playerId: score.playerId,
        point: score.point,
      })),
    ).toEqual([
      { playerId: 'A', point: 20 },
      { playerId: 'B', point: -5 },
      { playerId: 'C', point: -15 },
    ]);
  });

  it('throws error for invalid player count (e.g. 2)', () => {
    const players = [createPlayer('A', 30000, 'East'), createPlayer('B', 30000, 'South')];

    expect(() => calculateFinalScores(players, baseSettings, 'test-error')).toThrow(
      'Invalid player count for Uma calculation: 2',
    );
  });

  it('throws error for invalid player count even when uma is disabled', () => {
    const players = [createPlayer('A', 30000, 'East'), createPlayer('B', 30000, 'South')];
    const settingsWithoutUma: GameSettings = {
      ...baseSettings,
      uma: [0, 0],
    };

    expect(() => calculateFinalScores(players, settingsWithoutUma, 'test-no-uma')).toThrow(
      /player count|不正なプレイヤー人数|Invalid player count/i,
    );
  });

  it('applies yakitori settlement points only when enabled', () => {
    const settingsWithYakitori: GameSettings = {
      ...baseSettings,
      yakitoriEnabled: true,
      yakitoriPoint: 10,
    };
    const players = [
      createPlayer('A', 40000, 'East'),
      createPlayer('B', 25000, 'South'),
      createPlayer('C', 20000, 'West'),
      createPlayer('D', 15000, 'North'),
    ];

    const result = calculateFinalScores(players, settingsWithYakitori, 'test-yakitori', {
      handLogs: [createWinLog(['A']), createWinLog(['C'])],
    });

    expect(result.scores.map((s) => [s.playerId, s.point])).toEqual([
      ['A', 80],
      ['B', -15],
      ['C', 0],
      ['D', -65],
    ]);
  });

  it('does not apply yakitori when everyone has won at least once', () => {
    const settingsWithYakitori: GameSettings = {
      ...baseSettings,
      yakitoriEnabled: true,
      yakitoriPoint: 10,
    };
    const players = [
      createPlayer('A', 40000, 'East'),
      createPlayer('B', 25000, 'South'),
      createPlayer('C', 20000, 'West'),
      createPlayer('D', 15000, 'North'),
    ];

    const result = calculateFinalScores(players, settingsWithYakitori, 'test-yakitori-none', {
      handLogs: [
        createWinLog(['A']),
        createWinLog(['B']),
        createWinLog(['C']),
        createWinLog(['D']),
      ],
    });

    expect(result.scores.map((s) => [s.playerId, s.point])).toEqual([
      ['A', 60],
      ['B', 5],
      ['C', -20],
      ['D', -45],
    ]);
  });

  it('does not apply yakitori payment when nobody won in the game', () => {
    const settingsWithYakitori: GameSettings = {
      ...baseSettings,
      yakitoriEnabled: true,
      yakitoriPoint: 10,
    };
    const players = [
      createPlayer('A', 40000, 'East'),
      createPlayer('B', 25000, 'South'),
      createPlayer('C', 20000, 'West'),
      createPlayer('D', 15000, 'North'),
    ];

    const result = calculateFinalScores(players, settingsWithYakitori, 'test-yakitori-draw-only', {
      handLogs: [],
    });

    expect(result.scores.map((s) => [s.playerId, s.point])).toEqual([
      ['A', 60],
      ['B', 5],
      ['C', -20],
      ['D', -45],
    ]);
  });
});

describe('current rank helpers', () => {
  const createPlayer = (id: string, score: number, wind: Player['wind']): Player => ({
    id,
    name: id,
    score,
    wind,
    isRiichi: false,
    chip: 0,
  });

  it('sorts players by score descending', () => {
    const players = [
      createPlayer('B', 24000, 'South'),
      createPlayer('A', 31000, 'East'),
      createPlayer('D', 18000, 'North'),
      createPlayer('C', 27000, 'West'),
    ];

    const sorted = sortPlayersByRank(players);

    expect(sorted.map((player) => player.id)).toEqual(['A', 'C', 'B', 'D']);
  });

  it('breaks ties by seating order in 4ma', () => {
    const players = [
      createPlayer('seat1', 25000, 'West'),
      createPlayer('seat2', 25000, 'East'),
      createPlayer('seat3', 25000, 'North'),
      createPlayer('seat4', 25000, 'South'),
    ];

    const ranks = getCurrentPlayerRanks(players);

    expect(ranks).toEqual({
      seat1: 1,
      seat2: 2,
      seat3: 3,
      seat4: 4,
    });
  });

  it('breaks ties by seating order in 3ma', () => {
    const players = [
      createPlayer('seat1', 32000, 'West'),
      createPlayer('seat2', 32000, 'East'),
      createPlayer('seat3', 32000, 'South'),
    ];

    const ranks = getCurrentPlayerRanks(players);

    expect(ranks).toEqual({
      seat1: 1,
      seat2: 2,
      seat3: 3,
    });
  });

  it('keeps seating order only within the tied score group', () => {
    const players = [
      createPlayer('seat1', 32000, 'West'),
      createPlayer('seat2', 32000, 'East'),
      createPlayer('seat3', 25000, 'North'),
      createPlayer('seat4', 25000, 'South'),
    ];

    const sorted = sortPlayersByRank(players);

    expect(sorted.map((player) => player.id)).toEqual(['seat1', 'seat2', 'seat3', 'seat4']);
  });
});

describe('distributeRemainingRiichiSticks', () => {
  const createPlayer = (id: string, score: number, wind: Player['wind']): Player => ({
    id,
    name: id,
    score,
    wind,
    isRiichi: false,
    chip: 0,
  });

  it('adds remaining riichi sticks (as points) to the top-ranked player', () => {
    const players = [
      createPlayer('A', 40000, 'East'),
      createPlayer('B', 30000, 'South'),
      createPlayer('C', 20000, 'West'),
      createPlayer('D', 10000, 'North'),
    ];
    const result = distributeRemainingRiichiSticks(players, 2);
    const topPlayer = result.find((p) => p.id === 'A')!;
    expect(topPlayer.score).toBe(42000); // 40000 + 2 * 1000
    // Others unchanged
    expect(result.find((p) => p.id === 'B')!.score).toBe(30000);
    expect(result.find((p) => p.id === 'C')!.score).toBe(20000);
    expect(result.find((p) => p.id === 'D')!.score).toBe(10000);
  });

  it('returns players unchanged when riichiSticks is 0', () => {
    const players = [createPlayer('A', 25000, 'East'), createPlayer('B', 25000, 'South')];
    const result = distributeRemainingRiichiSticks(players, 0);
    expect(result).toEqual(players);
  });

  it('gives sticks to the first player by seating order when scores are tied', () => {
    const players = [
      createPlayer('A', 25000, 'South'),
      createPlayer('B', 25000, 'East'),
      createPlayer('C', 25000, 'West'),
      createPlayer('D', 25000, 'North'),
    ];
    const result = distributeRemainingRiichiSticks(players, 3);
    // A is first in seating order among tied players → gets sticks
    expect(result.find((p) => p.id === 'A')!.score).toBe(28000);
    expect(result.find((p) => p.id === 'B')!.score).toBe(25000);
  });
});

describe('calculateFinalScores with gameEndReason', () => {
  const baseSettings: GameSettings = {
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
    westExtension: false,
    rate: 50,
  };

  const createPlayer = (id: string, score: number, wind: Player['wind']): Player => ({
    id,
    name: id,
    score,
    wind,
    isRiichi: false,
    chip: 0,
  });

  it('sets gameEndReason on result when provided', () => {
    const players = [
      createPlayer('A', 40000, 'East'),
      createPlayer('B', 25000, 'South'),
      createPlayer('C', 20000, 'West'),
      createPlayer('D', 15000, 'North'),
    ];
    const result = calculateFinalScores(players, baseSettings, 'test-abort', {
      gameEndReason: 'Aborted',
    });
    expect(result.gameEndReason).toBe('Aborted');
  });

  it('does not set gameEndReason when not provided', () => {
    const players = [
      createPlayer('A', 40000, 'East'),
      createPlayer('B', 25000, 'South'),
      createPlayer('C', 20000, 'West'),
      createPlayer('D', 15000, 'North'),
    ];
    const result = calculateFinalScores(players, baseSettings, 'test-normal');
    expect(result.gameEndReason).toBeUndefined();
  });
});

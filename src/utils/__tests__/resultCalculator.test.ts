import { describe, expect, it } from 'vitest';
import type { GameSettings, Player } from '../../types';
import { calculateFinalScores } from '../resultCalculator';

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

  it('handles Tie-breaker by Wind Priority', () => {
    // A: 25000 (East)
    // B: 25000 (South)
    // C: 25000 (West)
    // D: 25000 (North)

    const players = [
      createPlayer('C', 25000, 'West'),
      createPlayer('A', 25000, 'East'),
      createPlayer('D', 25000, 'North'),
      createPlayer('B', 25000, 'South'),
    ];

    const result = calculateFinalScores(players, baseSettings, 'test-tie');
    const sorted = result.scores;

    expect(sorted[0].playerId).toBe('A'); // East
    expect(sorted[1].playerId).toBe('B'); // South
    expect(sorted[2].playerId).toBe('C'); // West
    expect(sorted[3].playerId).toBe('D'); // North
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
});

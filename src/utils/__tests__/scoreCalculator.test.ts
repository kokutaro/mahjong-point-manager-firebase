import { describe, expect, it } from 'vitest';
import { calculateBasePoints, calculateRyukyokuScore, calculateScore } from '../scoreCalculator';

describe('calculateRyukyokuScore', () => {
  describe('4ma (4-player)', () => {
    it('should split 3000 points correctly', () => {
      // 1 Tenpai (+3000), 3 Noten (-1000 each)
      expect(calculateRyukyokuScore(1, 3)).toEqual({ tenpai: 3000, noten: -1000 });
      // 2 Tenpai (+1500 each), 2 Noten (-1500 each)
      expect(calculateRyukyokuScore(2, 2)).toEqual({ tenpai: 1500, noten: -1500 });
      // 3 Tenpai (+1000 each), 1 Noten (-3000)
      expect(calculateRyukyokuScore(3, 1)).toEqual({ tenpai: 1000, noten: -3000 });
      // All Tenpai
      expect(calculateRyukyokuScore(4, 0)).toEqual({ tenpai: 0, noten: 0 });
      // All Noten
      expect(calculateRyukyokuScore(0, 4)).toEqual({ tenpai: 0, noten: 0 });
    });
  });

  describe('3ma (3-player)', () => {
    // User rule: Noten pays 1000 to Tenpai
    // 3 Players total
    it('should follow Noten pays 1000 rule', () => {
      // 1 Tenpai (Gets 1000 * 2 = 2000), 2 Noten (-1000 each)
      expect(calculateRyukyokuScore(1, 2, '3ma')).toEqual({ tenpai: 2000, noten: -1000 });
      // 2 Tenpai (Gets 1000 each), 1 Noten (Pays 1000 * 2 = 2000)
      expect(calculateRyukyokuScore(2, 1, '3ma')).toEqual({ tenpai: 1000, noten: -2000 });
      // All Tenpai
      expect(calculateRyukyokuScore(3, 0, '3ma')).toEqual({ tenpai: 0, noten: 0 });
      // All Noten
      expect(calculateRyukyokuScore(0, 3, '3ma')).toEqual({ tenpai: 0, noten: 0 });
    });
  });
});

describe('calculateBasePoints', () => {
  it('should not round up 4 Han 30 Fu to Mangan (Kiriage Mangan disabled)', () => {
    const result = calculateBasePoints(4, 30);
    // 30 * 2^(2+4) = 30 * 64 = 1920
    expect(result.points).toBe(1920);
    expect(result.name).not.toBe('Mangan');
  });

  it('should not round up 3 Han 60 Fu to Mangan (Kiriage Mangan disabled)', () => {
    const result = calculateBasePoints(3, 60);
    // 60 * 2^(2+3) = 60 * 32 = 1920
    expect(result.points).toBe(1920);
    expect(result.name).not.toBe('Mangan');
  });

  it('should calculate Mangan for 5 Han', () => {
    const result = calculateBasePoints(5, 30);
    expect(result.name).toBe('Mangan');
  });
});

describe('calculateScore', () => {
  it('should calculate 7700 for Non-Dealer 4 Han 30 Fu Ron', () => {
    // 1920 base * 4 = 7680 -> ceil 7700
    const result = calculateScore(4, 30, false, false);
    expect(result.ron).toBe(7700);
  });

  it('should calculate 11600 for Dealer 4 Han 30 Fu Ron', () => {
    // 1920 base * 6 = 11520 -> ceil 11600
    const result = calculateScore(4, 30, true, false);
    expect(result.ron).toBe(11600);
  });
});

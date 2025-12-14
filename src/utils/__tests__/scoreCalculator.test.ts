import { describe, expect, it } from 'vitest';
import { calculateRyukyokuScore } from '../scoreCalculator';

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

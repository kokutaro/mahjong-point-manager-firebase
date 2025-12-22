import { describe, expect, it } from 'vitest';
import { SCORE_LIMITS } from './mahjongRules';
import { calculateBasePoints, calculateRyukyokuScore, calculateScore } from './scoreCalculator';

describe('scoreCalculator', () => {
  describe('calculateBasePoints', () => {
    it('calculates Mangan (5 han)', () => {
      const result = calculateBasePoints(5, 30);
      expect(result.points).toBe(SCORE_LIMITS.MANGAN);
      expect(result.name).toBe('Mangan');
    });

    it('calculates Haneman (6 han)', () => {
      const result = calculateBasePoints(6, 30);
      expect(result.points).toBe(SCORE_LIMITS.HANEMAN);
      expect(result.name).toBe('Haneman');
    });

    it('calculates Haneman (7 han)', () => {
      const result = calculateBasePoints(7, 30);
      expect(result.points).toBe(SCORE_LIMITS.HANEMAN);
      expect(result.name).toBe('Haneman');
    });

    it('calculates Baiman (8 han)', () => {
      const result = calculateBasePoints(8, 30);
      expect(result.points).toBe(SCORE_LIMITS.BAIMAN);
      expect(result.name).toBe('Baiman');
    });

    it('calculates Baiman (10 han)', () => {
      const result = calculateBasePoints(10, 30);
      expect(result.points).toBe(SCORE_LIMITS.BAIMAN);
      expect(result.name).toBe('Baiman');
    });

    it('calculates Sanbaiman (11 han)', () => {
      const result = calculateBasePoints(11, 30);
      expect(result.points).toBe(SCORE_LIMITS.SANBAIMAN);
      expect(result.name).toBe('Sanbaiman');
    });

    it('calculates Yakuman (13 han)', () => {
      const result = calculateBasePoints(13, 30);
      expect(result.points).toBe(SCORE_LIMITS.YAKUMAN);
      expect(result.name).toBe('Yakuman');
    });

    it('calculates standard points correcty', () => {
      // 30fu 1han = 30 * 8 = 240
      const res = calculateBasePoints(1, 30);
      expect(res.points).toBe(240);
      expect(res.name).toBe('1翻30符');
    });

    it('caps at Mangan for high fu/han combination that exceeds 2000 base', () => {
      // 4han 40fu = 40 * 64 = 2560 > 2000 -> Mangan
      const res = calculateBasePoints(4, 40);
      expect(res.points).toBe(SCORE_LIMITS.MANGAN);
      expect(res.name).toBe('Mangan');
    });
  });

  describe('calculateScore (Fixed Points / useFuCalculation = false)', () => {
    describe('1 Han', () => {
      it('Child Ron', () => {
        const res = calculateScore(1, 30, false, false, false, false);
        expect(res.ron).toBe(1000);
        expect(res.name).toBe('1翻 (固定)');
      });
      it('Dealer Ron', () => {
        const res = calculateScore(1, 30, true, false, false, false);
        expect(res.ron).toBe(1500);
      });
      it('Child Tsumo (4ma)', () => {
        const res = calculateScore(1, 30, false, true, false, false);
        // 1000 fixed -> Tsumo 300/500
        expect(res.tsumoKo).toBe(300);
        expect(res.tsumoOya).toBe(500);
      });
      it('Dealer Tsumo (4ma)', () => {
        const res = calculateScore(1, 30, true, true, false, false);
        // 1500 fixed -> Tsumo 500all
        expect(res.tsumoAll).toBe(500);
      });
      it('Dealer Tsumo (3ma)', () => {
        // Dealer Tsumo 500all.
        // 3ma: Split phantom 500 / 2 = 250 -> ceil100 -> 300
        // Pay: 500 + 300 = 800
        const res = calculateScore(1, 30, true, true, true, false);
        expect(res.tsumoAll).toBe(800);
      });
    });

    describe('2 Han', () => {
      it('Child Ron', () => {
        const res = calculateScore(2, 30, false, false, false, false);
        expect(res.ron).toBe(2000);
      });
      it('Dealer Ron', () => {
        const res = calculateScore(2, 30, true, false, false, false);
        expect(res.ron).toBe(3000);
      });
      it('Child Tsumo (4ma)', () => {
        const res = calculateScore(2, 30, false, true, false, false);
        // 2000 fixed -> Tsumo 500/1000
        expect(res.tsumoKo).toBe(500);
        expect(res.tsumoOya).toBe(1000);
      });
      it('Dealer Tsumo (4ma)', () => {
        const res = calculateScore(2, 30, true, true, false, false);
        // 3000 fixed -> Tsumo 1000all
        expect(res.tsumoAll).toBe(1000);
      });
    });

    describe('3 Han', () => {
      it('Child Ron', () => {
        const res = calculateScore(3, 30, false, false, false, false);
        expect(res.ron).toBe(4000);
      });
      it('Dealer Ron', () => {
        const res = calculateScore(3, 30, true, false, false, false);
        expect(res.ron).toBe(6000);
      });
      it('Child Tsumo (4ma)', () => {
        const res = calculateScore(3, 30, false, true, false, false);
        // 4000 fixed -> Tsumo 1000/2000
        expect(res.tsumoKo).toBe(1000);
        expect(res.tsumoOya).toBe(2000);
      });
      it('Dealer Tsumo (4ma)', () => {
        const res = calculateScore(3, 30, true, true, false, false);
        // 6000 fixed -> Tsumo 2000all
        expect(res.tsumoAll).toBe(2000);
      });
      it('Child Tsumo (3ma)', () => {
        // Child Tsumo 1000/2000 (4ma)
        // 3ma Tsumo:
        //   Phantom North (Ko) pays 1000.
        //   Split 1000 / 2 = 500.
        //   Ko pays: 1000 + 500 = 1500.
        //   Oya pays: 2000 + 500 = 2500.
        const res = calculateScore(3, 30, false, true, true, false);
        expect(res.tsumoKo).toBe(1500);
        expect(res.tsumoOya).toBe(2500);
      });
    });
  });

  describe('calculateScore (Standard Mode / useFuCalculation = true)', () => {
    it('Child Ron Mangan', () => {
      const res = calculateScore(5, 30, false, false, false, true);
      expect(res.ron).toBe(8000);
      expect(res.name).toBe('Mangan');
    });

    it('Dealer Ron Mangan', () => {
      const res = calculateScore(5, 30, true, false, false, true);
      expect(res.ron).toBe(12000);
    });

    describe('3-Player Tsumo Logic', () => {
      // Mangan Base 2000
      // Child Tsumo (4ma): Ko 2000, Oya 4000
      // 3ma Child Tsumo:
      //   Phantom North (Ko) pays 2000.
      //   Split 2000 / 2 = 1000.
      //   Ko pays: 2000 + 1000 = 3000.
      //   Oya pays: 4000 + 1000 = 5000.
      it('Child Tsumo Mangan (3ma)', () => {
        const res = calculateScore(5, 30, false, true, true, true);
        expect(res.tsumoKo).toBe(3000);
        expect(res.tsumoOya).toBe(5000);
      });

      // Mangan Base 2000
      // Dealer Tsumo (4ma): All Ko pay 4000.
      // 3ma Dealer Tsumo:
      //   Phantom North (Ko) pays 4000.
      //   Split 4000 / 2 = 2000.
      //   Ko pays: 4000 + 2000 = 6000.
      it('Dealer Tsumo Mangan (3ma)', () => {
        const res = calculateScore(5, 30, true, true, true, true);
        expect(res.tsumoAll).toBe(6000);
      });
    });
  });

  describe('calculateRyukyokuScore', () => {
    describe('4ma', () => {
      it('1 Tenpai / 3 Noten', () => {
        // Total 3000. Tenpai gets 3000. Noten pays 1000 each.
        const res = calculateRyukyokuScore(1, 3, '4ma');
        expect(res.tenpai).toBe(3000);
        expect(res.noten).toBe(-1000);
      });
      it('2 Tenpai / 2 Noten', () => {
        // Tenpai gets 1500. Noten pays 1500.
        const res = calculateRyukyokuScore(2, 2, '4ma');
        expect(res.tenpai).toBe(1500);
        expect(res.noten).toBe(-1500);
      });
      it('3 Tenpai / 1 Noten', () => {
        // Tenpai gets 1000. Noten pays 3000.
        const res = calculateRyukyokuScore(3, 1, '4ma');
        expect(res.tenpai).toBe(1000);
        expect(res.noten).toBe(-3000);
      });
      it('No one Tenpai', () => {
        const res = calculateRyukyokuScore(0, 4, '4ma');
        expect(res).toEqual({ tenpai: 0, noten: 0 });
      });
      it('All Tenpai', () => {
        const res = calculateRyukyokuScore(4, 0, '4ma');
        expect(res).toEqual({ tenpai: 0, noten: 0 });
      });
    });

    describe('3ma', () => {
      // 3ma rule: Noten pays 1000 to Tenpai essentially.
      // Or usually defined as: Field Total depends.
      // Spec implementation:
      // "Noten pays 1000 to Tenpai" -> Wait, logic says:
      // tenpai: 1000 * notenCount
      // noten: -1000 * tenpaiCount

      it('1 Tenpai / 2 Noten', () => {
        // Tenpai gets 1000 * 2 = 2000.
        // Noten pays 1000 * 1 = 1000.
        const res = calculateRyukyokuScore(1, 2, '3ma');
        expect(res.tenpai).toBe(2000);
        expect(res.noten).toBe(-1000);
      });

      it('2 Tenpai / 1 Noten', () => {
        // Tenpai gets 1000 * 1 = 1000.
        // Noten pays 1000 * 2 = 2000.
        const res = calculateRyukyokuScore(2, 1, '3ma');
        expect(res.tenpai).toBe(1000);
        expect(res.noten).toBe(-2000);
      });

      it('No one Tenpai', () => {
        const res = calculateRyukyokuScore(0, 3, '3ma');
        expect(res).toEqual({ tenpai: 0, noten: 0 });
      });
    });
  });
});

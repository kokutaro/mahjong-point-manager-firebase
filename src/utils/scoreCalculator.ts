import { SCORE_LIMITS } from './mahjongRules';
import { normalizeNoFuFixedPoints } from './gameSettings';

import type { NoFuFixedPointHan, NoFuFixedPoints, ScorePayment } from '../types';

/**
 * Ceil score to nearest 100
 */
const ceil100 = (points: number): number => {
  return Math.ceil(points / 100) * 100;
};

const getYakumanName = (multiplier: number): string => {
  if (multiplier <= 1) return '役満';
  if (multiplier === 2) return 'W役満';
  if (multiplier === 3) return 'T役満';
  if (multiplier === 4) return '4倍役満';
  return `${multiplier}倍役満`;
};

/**
 * Calculate base points from Han and Fu
 * Base Points = fu * 2^(2+han)
 */
export const calculateBasePoints = (han: number, fu: number): { points: number; name: string } => {
  if (han >= 13) {
    const yakumanMultiplier = Math.max(1, Math.floor(han / 13));

    return {
      points: SCORE_LIMITS.YAKUMAN * yakumanMultiplier,
      name: getYakumanName(yakumanMultiplier),
    };
  }
  if (han >= 11) return { points: SCORE_LIMITS.SANBAIMAN, name: 'Sanbaiman' };
  if (han >= 8) return { points: SCORE_LIMITS.BAIMAN, name: 'Baiman' };
  if (han >= 6) return { points: SCORE_LIMITS.HANEMAN, name: 'Haneman' };
  if (han >= 5) return { points: SCORE_LIMITS.MANGAN, name: 'Mangan' };

  // Calculate generic (Man/Pin)
  // fu * 2^(2+han)
  const points = fu * Math.pow(2, 2 + han);

  // Check limits (normal flow)
  if (points > SCORE_LIMITS.MANGAN) {
    return { points: SCORE_LIMITS.MANGAN, name: 'Mangan' }; // Kiriage Mangan condition? usually 4han 30fu / 3han 60fu is mangan?
    // Standard: 2000 base limit.
    // Kiriage Mangan: 4 han 30 fu = 1920 -> 2000.
    // 3 han 60 fu = 1920 -> 2000.
    // If following generic rule, 1920 is < 2000.
    // Many apps allow Kiriage setting. For now, strict calculation.
  }

  return { points, name: `${han}翻${fu}符` };
};

/**
 * Calculate payments for a win
 */
export const calculateScore = (
  han: number,
  fu: number,
  isDealer: boolean,
  isTsumo: boolean,
  is3Player: boolean = false,
  useFuCalculation: boolean = true,
  noFuFixedPoints?: NoFuFixedPoints,
): ScorePayment => {
  // If no fu calculation and han is small (1-3), return fixed points
  if (!useFuCalculation && han <= 3) {
    const fixedHan = han as NoFuFixedPointHan;
    const normalizedFixedPoints = normalizeNoFuFixedPoints(noFuFixedPoints);
    const fixedPoints = normalizedFixedPoints[fixedHan];
    const ronPay = isDealer ? fixedPoints.dealer : fixedPoints.child;
    const name = `${han}翻 (固定)`;

    if (isTsumo) {
      if (isDealer) {
        let finalPay = ceil100(ronPay / 3);

        if (is3Player) {
          const split = ceil100(finalPay / 2);
          finalPay += split;
        }

        return {
          tsumoAll: finalPay,
          basePoints: 0, // Dummy
          name,
        };
      } else {
        let finalPayKo = ceil100(ronPay / 4);
        let finalPayOya = ceil100(ronPay / 2);

        if (is3Player) {
          const split = ceil100(finalPayKo / 2);
          finalPayKo += split;
          finalPayOya += split;
        }

        return {
          tsumoOya: finalPayOya,
          tsumoKo: finalPayKo,
          basePoints: 0,
          name,
        };
      }
    } else {
      return {
        ron: ronPay,
        basePoints: 0,
        name,
      };
    }
  }

  const normalizedHan = !useFuCalculation && han === 4 ? 5 : han;
  const { points: base, name } = calculateBasePoints(normalizedHan, fu);

  if (isDealer) {
    if (isTsumo) {
      // Dealer Tsumo
      // 4ma: All Ko pay ceil100(base * 2)
      const basePay = ceil100(base * 2);

      let finalPay = basePay;
      if (is3Player) {
        // 3ma: Phantom (North) would pay basePay.
        // Split this phantom payment between 2 remaining players.
        const phantomPayment = basePay;
        const splitPart = ceil100(phantomPayment / 2);
        finalPay += splitPart;
      }

      return {
        tsumoAll: finalPay,
        basePoints: base,
        name,
      };
    } else {
      // Dealer Ron: Target pays ceil100(base * 6)
      const pay = ceil100(base * 6);
      return {
        ron: pay,
        basePoints: base,
        name,
      };
    }
  } else {
    // Non-Dealer
    if (isTsumo) {
      // Kid Tsumo
      // 4ma: Dealer pays ceil100(base * 2), Kid pays ceil100(base)
      const basePayOya = ceil100(base * 2);
      const basePayKo = ceil100(base);

      let finalPayOya = basePayOya;
      let finalPayKo = basePayKo;

      if (is3Player) {
        // 3ma: Phantom (North) would pay basePayKo (since North is Treated as Ko).
        const phantomPayment = basePayKo;
        const splitPart = ceil100(phantomPayment / 2);

        finalPayOya += splitPart;
        finalPayKo += splitPart;
      }

      return {
        tsumoOya: finalPayOya,
        tsumoKo: finalPayKo,
        basePoints: base,
        name,
      };
    } else {
      // Kid Ron: Target pays ceil100(base * 4)
      const pay = ceil100(base * 4);
      return {
        ron: pay,
        basePoints: base,
        name,
      };
    }
  }
};

/**
 * Calculate Ryukyoku scores (Tenpai/Noten)
 */
export const calculateRyukyokuScore = (
  tenpaiCount: number,
  notenCount: number,
  mode: '4ma' | '3ma' = '4ma',
): { tenpai: number; noten: number } => {
  if (tenpaiCount === 0 || notenCount === 0) {
    return { tenpai: 0, noten: 0 };
  }

  if (mode === '4ma') {
    // Total 3000
    // 1 Tenpai: +3000, 3 Noten: -1000
    // 2 Tenpai: +1500, 2 Noten: -1500
    // 3 Tenpai: +1000, 1 Noten: -3000
    const totalPot = 3000;
    return {
      tenpai: totalPot / tenpaiCount,
      noten: -(totalPot / notenCount),
    };
  } else {
    // 3ma
    // Noten pays 1000 to Tenpai
    // 1 Tenpai / 2 Noten: Each Noten pays 1000 (Total 2000). Tenpai gets 2000.
    // Score: Tenpai +2000, Noten -1000
    // 2 Tenpai / 1 Noten: Noten pays 1000 to each Tenpai (Total 2000). Each Tenpai gets 1000.
    // Score: Tenpai +1000, Noten -2000
    return {
      tenpai: 1000 * notenCount,
      noten: -1000 * tenpaiCount,
    };
  }
};

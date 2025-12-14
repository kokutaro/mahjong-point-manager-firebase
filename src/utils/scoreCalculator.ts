import { SCORE_LIMITS } from './mahjongRules';

export interface ScorePayment {
  ron?: number;         // Payment from target in Ron
  tsumoAll?: number;    // Payment from everyone (if same)
  tsumoOya?: number;    // Payment from Dealer (in Tsumo)
  tsumoKo?: number;     // Payment from Non-Dealer (in Tsumo)
  basePoints: number;   // Calculated base points (before rounding/multiplying)
  name: string;         // e.g. "Mangan", "30fu 4han"
}

/**
 * Ceil score to nearest 100
 */
const ceil100 = (points: number): number => {
  return Math.ceil(points / 100) * 100;
};

/**
 * Calculate base points from Han and Fu
 * Base Points = fu * 2^(2+han)
 */
export const calculateBasePoints = (han: number, fu: number): { points: number, name: string } => {
  if (han >= 13) return { points: SCORE_LIMITS.YAKUMAN, name: 'Yakuman' };
  if (han >= 11) return { points: SCORE_LIMITS.SANBAIMAN, name: 'Sanbaiman' };
  if (han >= 8) return { points: SCORE_LIMITS.BAIMAN, name: 'Baiman' };
  if (han >= 6) return { points: SCORE_LIMITS.HANEMAN, name: 'Haneman' };
  if (han >= 5) return { points: SCORE_LIMITS.MANGAN, name: 'Mangan' };

  // Calculate generic (Man/Pin)
  // fu * 2^(2+han)
  let points = fu * Math.pow(2, 2 + han);

  // Kiriage Mangan (30fu 4han / 60fu 3han => 1920 => 2000)
  if (points >= 1920) {
    return { points: SCORE_LIMITS.MANGAN, name: 'Mangan' };
  }

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
  isTsumo: boolean
): ScorePayment => {
  const { points: base, name } = calculateBasePoints(han, fu);

  if (isDealer) {
    if (isTsumo) {
      // Dealer Tsumo: All Ko pay ceil100(base * 2)
      const pay = ceil100(base * 2);
      return {
        tsumoAll: pay,
        basePoints: base,
        name
      };
    } else {
      // Dealer Ron: Target pays ceil100(base * 6)
      const pay = ceil100(base * 6);
      return {
        ron: pay,
        basePoints: base,
        name
      };
    }
  } else {
    // Non-Dealer
    if (isTsumo) {
      // Kid Tsumo: Dealer pays ceil100(base * 2), Kid pays ceil100(base)
      const payOya = ceil100(base * 2);
      const payKo = ceil100(base);
      return {
        tsumoOya: payOya,
        tsumoKo: payKo,
        basePoints: base,
        name
      };
    } else {
      // Kid Ron: Target pays ceil100(base * 4)
      const pay = ceil100(base * 4);
      return {
        ron: pay,
        basePoints: base,
        name
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
  mode: '4ma' | '3ma' = '4ma'
): { tenpai: number, noten: number } => {
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
      noten: - (totalPot / notenCount)
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
      noten: -1000 * tenpaiCount
    };
  }
};

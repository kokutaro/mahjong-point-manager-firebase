import { SCORE_LIMITS } from './mahjongRules';

import type { ScorePayment } from '../types';

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
  useFuCalculation: boolean = true
): ScorePayment => {
  // If no fu calculation and han is small (1-3), return fixed points
  if (!useFuCalculation && han <= 3) {
    // Fixed points:
    // 1 Han: 30 Fu equivalent (Child 1000/Dealer 1500)
    // 2 Han: 30 Fu equivalent (Child 2000/Dealer 3000)
    // 3 Han: Fixed to Child 4000/Dealer 6000 (Request spec)

    // Note: The spec request says:
    // 1-3 Han: Child 1000, 2000, 4000
    //          Dealer 1500, 3000, 6000
    // We construct special ScorePayment for this.

    let ronPay = 0;
    let name = '';

    if (han === 1) {
      name = '1翻 (固定)';
      if (isDealer) {
        // Dealer 1500
        ronPay = 1500;
      } else {
        // Child 1000
        ronPay = 1000;
      }
    } else if (han === 2) {
      name = '2翻 (固定)';
      if (isDealer) {
        // Dealer 3000 (usually 2900 30fu) -> 3000 fixed
        ronPay = 3000;
      } else {
        // Child 2000
        ronPay = 2000;
      }
    } else if (han === 3) {
      name = '3翻 (固定)';
      if (isDealer) {
        // Dealer 6000 (usually 5800 30fu) -> 6000 fixed
        ronPay = 6000;
      } else {
        // Child 4000 (usually 3900 30fu) -> 4000 fixed
        ronPay = 4000;
      }
    }

    // Tsumo Logic fix for 3ma regarding fixed points? 
    // Spec says strictly:
    // Child: 1000, 2000, 4000
    // Dealer: 1500, 3000, 6000

    // We need to adhere to standard Tsumo split logic or fixed Tsumo Tables?
    // "点数は子1000,2000,4000/親1500,3000,6000" Usually refers to Ron score.
    // Let's derive Tsumo from these Ron scores roughly, or use standard table if available.
    // If 1 Han Child Ron 1000 -> Tsumo 300/500
    // If 2 Han Child Ron 2000 -> Tsumo 500/1000
    // If 3 Han Child Ron 4000 -> Tsumo 1000/2000

    // If 1 Han Dealer Ron 1500 -> Tsumo 500all
    // If 2 Han Dealer Ron 3000 -> Tsumo 1000all
    // If 3 Han Dealer Ron 6000 -> Tsumo 2000all

    // 3ma adjustments for Tsumo:
    // Dealer Tsumo 1500 -> 500all (2 players) -> Total 1000? Short 500. 
    // 3ma Tsumo rule usually: North payment is split.

    // Let's use the Ron score as base and apply split logic like normal, but overriding base points is hard because reverse engineering base from fixed score is messy.
    // Instead, define Tsumo payments directly.

    if (isTsumo) {
      if (isDealer) {
        // Dealer Tsumo
        // base Ron = X. 4ma Tsumo = X/3 each. 3ma = ?

        // 4ma Tsumo All:
        // 1 Han (1500) -> 500 all
        // 2 Han (3000) -> 1000 all
        // 3 Han (6000) -> 2000 all

        let payPerPerson = 0;
        if (han === 1) payPerPerson = 500;
        else if (han === 2) payPerPerson = 1000;
        else if (han === 3) payPerPerson = 2000;

        let finalPay = payPerPerson;

        if (is3Player) {
          // 3ma specific Tsumo logic from previous tasks:
          // "Phantom North payment split between 2 players"
          // Phantom North pays 'payPerPerson'
          // Split = ceil100(payPerPerson / 2)
          // Each existing ko pays payPerPerson + split
          const split = ceil100(payPerPerson / 2);
          finalPay = payPerPerson + split;
        }

        return {
          tsumoAll: finalPay,
          basePoints: 0, // Dummy
          name
        };
      } else {
        // Child Tsumo
        // 4ma Tsumo:
        // 1 Han (1000) -> 300/500
        // 2 Han (2000) -> 500/1000
        // 3 Han (4000) -> 1000/2000

        let payKo = 0;
        let payOya = 0;

        if (han === 1) { payKo = 300; payOya = 500; }
        else if (han === 2) { payKo = 500; payOya = 1000; }
        else if (han === 3) { payKo = 1000; payOya = 2000; }

        let finalPayKo = payKo;
        let finalPayOya = payOya;

        if (is3Player) {
          // Phantom North pays payKo.
          // Split = ceil100(payKo / 2)
          const split = ceil100(payKo / 2);
          finalPayKo += split;
          finalPayOya += split;
        }

        return {
          tsumoOya: finalPayOya,
          tsumoKo: finalPayKo,
          basePoints: 0,
          name
        };
      }
    } else {
      // Ron
      return {
        ron: ronPay,
        basePoints: 0,
        name
      };
    }
  }

  const { points: base, name } = calculateBasePoints(han, fu);

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

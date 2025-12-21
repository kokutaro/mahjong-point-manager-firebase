import type { ScorePayment } from '../types';

export interface PointDelta {
  playerId: string;
  total: number;
  hand: number;
  sticks: number;
}

export interface TransactionResult {
  deltas: PointDelta[];
  newRiichiSticks: number;
  newHonba: number;
}

/**
 * Calculate score differences for a win
 */
export const calculateTransaction = (
  payment: ScorePayment,
  winnerId: string,
  loserId: string | null,
  playerIds: string[],
  dealerId: string,
  honba: number,
  riichiSticks: number
): TransactionResult => {
  const deltas: PointDelta[] = playerIds.map(id => ({ playerId: id, total: 0, hand: 0, sticks: 0 }));
  const getDelta = (id: string) => deltas.find(d => d.playerId === id)!;

  // Honba points
  const honbaTotal = 300 * honba;
  // Riichi sticks
  const riichiTotal = 1000 * riichiSticks;

  // 1. Add Riichi Sticks to Winner (Purely Stick)
  getDelta(winnerId).sticks += riichiTotal;
  getDelta(winnerId).total += riichiTotal;

  if (loserId) {
    // --- RON ---
    const handPoint = payment.ron || 0;

    // Hand portion
    getDelta(winnerId).hand += handPoint;
    getDelta(loserId).hand -= handPoint;

    // Stick portion (Honba)
    getDelta(winnerId).sticks += honbaTotal;
    getDelta(loserId).sticks -= honbaTotal;

    // Total update
    getDelta(winnerId).total += (handPoint + honbaTotal);
    getDelta(loserId).total -= (handPoint + honbaTotal);

  } else {
    // --- TSUMO ---
    playerIds.forEach(pid => {
      if (pid === winnerId) return;

      let payAmount = 0;
      const honbaPay = 100 * honba; // Assuming 4ma standard split

      if (payment.tsumoAll) {
        payAmount = payment.tsumoAll;
      } else if (pid === dealerId) {
        payAmount = payment.tsumoOya || 0;
      } else {
        payAmount = payment.tsumoKo || 0;
      }

      // Hand portion
      getDelta(pid).hand -= payAmount;
      getDelta(winnerId).hand += payAmount;

      // Stick portion
      getDelta(pid).sticks -= honbaPay;
      getDelta(winnerId).sticks += honbaPay;

      // Total
      const totalPay = payAmount + honbaPay;
      getDelta(pid).total -= totalPay;
      getDelta(winnerId).total += totalPay;
    });
  }

  return {
    deltas,
    newRiichiSticks: 0,
    newHonba: 0,
  };
};

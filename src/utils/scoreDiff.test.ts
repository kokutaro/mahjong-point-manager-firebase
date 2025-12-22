import { describe, expect, it } from 'vitest';
import type { ScorePayment } from '../types';
import { calculateTransaction } from './scoreDiff';

describe('scoreDiff', () => {
  describe('calculateTransaction', () => {
    it('should correctly calculate transaction for Non-Dealer Tsumo win', () => {
      // Setup
      // Scenario: Mangan (8000) Tsumo by Non-Dealer (Ko)
      // Dealer pays 4000, other Ko pays 2000
      const payment: ScorePayment = {
        tsumoAll: 0,
        tsumoKo: 2000,
        tsumoOya: 4000,
        ron: 0,
        basePoints: 2000,
        name: 'Mangan',
      };
      const winnerId = 'player2'; // Non-Dealer
      const loserId = null; // Tsumo
      const playerIds = ['player1', 'player2', 'player3', 'player4'];
      const dealerId = 'player1';
      const honba = 1; // 1 honba = 300 points total (100 per player)
      const riichiSticks = 1; // 1 riichi stick = 1000 points

      // Execute
      const result = calculateTransaction(
        payment,
        winnerId,
        loserId,
        playerIds,
        dealerId,
        honba,
        riichiSticks,
      );

      // Verify
      const winnerDelta = result.deltas.find((d) => d.playerId === winnerId);
      const dealerDelta = result.deltas.find((d) => d.playerId === dealerId);
      const koDelta = result.deltas.find((d) => d.playerId === 'player3');

      // Winner checks
      expect(winnerDelta).toBeDefined();
      if (winnerDelta) {
        // Hand: 4000 (from dealer) + 2000*2 (from ko) = 8000
        expect(winnerDelta.hand).toBe(8000);
        // Sticks: 1000 (Riichi) + 100*3 (Honba) = 1300
        expect(winnerDelta.sticks).toBe(1300);
        // Total: 8000 + 1300 = 9300
        expect(winnerDelta.total).toBe(9300);
      }

      // Dealer checks
      expect(dealerDelta).toBeDefined();
      if (dealerDelta) {
        // Pays 4000 (hand)
        // Pays 100 (honba)
        expect(dealerDelta.hand).toBe(-4000);
        expect(dealerDelta.sticks).toBe(-100);
        expect(dealerDelta.total).toBe(-4100);
      }

      // Other Ko checks
      expect(koDelta).toBeDefined();
      if (koDelta) {
        // Pays 2000 (hand)
        // Pays 100 (honba)
        expect(koDelta.hand).toBe(-2000);
        expect(koDelta.sticks).toBe(-100);
        expect(koDelta.total).toBe(-2100);
      }
    });
  });
});

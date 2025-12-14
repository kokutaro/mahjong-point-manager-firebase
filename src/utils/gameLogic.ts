import type { Player, RoomState } from '../types';
import type { ScorePayment } from './scoreCalculator';

export type GameEndReason = 'Bankruptcy' | 'ScoreReached' | 'MaxRoundReached';

export interface HandResult {
  type: 'Win' | 'Draw';
  winners?: {
    id: string;
    payment: ScorePayment; // Used to identify Tsumo/Ron logic via payment type if needed, or specific flags
  }[];
  loserId?: string | null;  // For Ron
  tenpaiPlayerIds?: string[]; // For Draw
}

export interface ProcessResult {
  nextRound: RoomState['round'];
  isGameOver: boolean;
  gameEndReason?: GameEndReason;
  newPlayers?: Player[]; // Only if wind rotation happens (optional for now)
}

/**
 * Calculates the state of the NEXT round based on current state and hand result.
 * Determines Dealer Rotation, Honba, Stick carry-over, and Game End.
 */
export const processHandEnd = (
  currentState: RoomState,
  result: HandResult
): ProcessResult => {
  const { round, players, settings } = currentState;
  const currentDealer = players.find(p => p.wind === 'East');
  // If no dealer found (should not happen), use players[0]
  const currentDealerId = currentDealer ? currentDealer.id : players[0].id;

  let isRenchan = false;
  let shouldResetHonba = false;

  // 1. Determine Dealer Rotation
  if (result.type === 'Win') {
    // Win Case
    const winners = result.winners || [];
    const isDealerWin = winners.some(w => w.id === currentDealerId);

    if (isDealerWin) {
      isRenchan = true;
      shouldResetHonba = false; // Add to existing
    } else {
      isRenchan = false;
      shouldResetHonba = true;  // Child win, reset to 0
    }

  } else {
    // Draw Case
    const tenpaiIds = result.tenpaiPlayerIds || [];
    const isDealerTenpai = tenpaiIds.includes(currentDealerId);

    // Tenpai Renchan setting
    if (settings.tenpaiRenchan) {
      // If Tenpai Renchan is ON: Dealer stays if Tenpai
      isRenchan = isDealerTenpai;
    } else {
      // If Tenpai Renchan is OFF (Agari Renchan): Dealer ALWAYS rotates on Draw
      isRenchan = false;
    }
    // Honba never resets on Draw. Always increments.
    shouldResetHonba = false;
  }

  // 2. Calculate Next Round State
  let nextRound = { ...round };

  // Apply Honba logic based on settings
  const incrementHonba = () => {
    // Treat undefined as true (default enabled)
    if (settings?.hasHonba !== false) {
      nextRound.honba += 1;
    } else {
      nextRound.honba = 0;
    }
  };

  const resetHonba = () => {
    nextRound.honba = 0;
  };

  if (isRenchan) {
    // Renchan: Same round, Honba + 1
    incrementHonba();
  } else {
    // Rotate: Value depends on result type for Honba reset
    if (shouldResetHonba) {
      resetHonba();
    } else {
      incrementHonba();
    }

    // Determine Wind/Number Transition
    const mode = settings.mode;
    const maxRound = mode === '4ma' ? 4 : 3;
    const currentNum = round.number;

    if (currentNum < maxRound) {
      // Just next Kyoku (e.g. E1 -> E2)
      nextRound.number += 1;
    } else {
      // End of Wind (e.g. E4 -> S1)
      nextRound.number = 1;
      // Rotate Round Wind
      if (round.wind === 'East') nextRound.wind = 'South';
      else if (round.wind === 'South') nextRound.wind = 'West';
      else if (round.wind === 'West') nextRound.wind = 'North';
      // else North -> Game End (handled in Game End logic later)
    }
    // Note: Actual Wind Rotation of Players is handled outside or requires player list mutation return.
    // This function returns "Round State".
  }

  // 3. Game End Checks
  let isGameOver = false;
  let gameEndReason: GameEndReason | undefined;

  // 3.1 Bankruptcy (Tobi)
  if (settings.useTobi) {
    const isBankruptcy = players.some(p => p.score < 0);
    if (isBankruptcy) {
      isGameOver = true;
      gameEndReason = 'Bankruptcy';
    }
  }

  // 3.2 Max Round Reached (All Last End)
  // Logic: If we are entering a round BEYOND South 4 (or South 3 in 3ma).
  const mode = settings.mode;
  const maxWindIndex = 1; // 0:East, 1:South. (West is 2). Usually game ends after South.
  const winds = ['East', 'South', 'West', 'North'];
  const nextWindIdx = winds.indexOf(nextRound.wind);

  // If we moved to West (Index 2), usually game over unless West-Ra (West Extension) enabled.
  if (!isGameOver && nextWindIdx > maxWindIndex) {
    // Entered West
    isGameOver = true;
    gameEndReason = 'MaxRoundReached';
    // Check if we should extend? (Not implemented for MVP)
  }

  // 3.3 Agari-Yame (Dealer Stop on All Last)
  if (!isGameOver && isRenchan) {
    // Check if we are in "All Last" (South 4 / South 3)
    const isSouth = round.wind === 'South';
    const maxR = mode === '4ma' ? 4 : 3;
    if (isSouth && round.number === maxR) {
      // We are in All Last and Renchan occurred (Dealer won or Tenpai).
      // If Dealer is Top and Score >= ReturnPoint -> End.
      // Who is dealer? `currentDealerId`.
      const dealer = players.find(p => p.id === currentDealerId);
      if (dealer) {
        const isTop = players.every(p => p.id === dealer.id || p.score < dealer.score);
        // Use configured Return Point (e.g. 30000)
        if (isTop && dealer.score >= settings.returnPoint) {
          isGameOver = true; // Agari Yame
          gameEndReason = 'ScoreReached';
        }
      }
    }
  }

  return {
    nextRound,
    isGameOver,
    gameEndReason
  };
};

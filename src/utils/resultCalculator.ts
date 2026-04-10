import type { GameResult, GameSettings, Player, PlayerGameResult } from '../types';
import { normalizeGameSettings } from './gameSettings';
import { getUmaPointsByRank } from './uma';

export const sortPlayersByRank = (players: Player[]): Player[] => {
  return players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => {
      if (b.player.score !== a.player.score) {
        return b.player.score - a.player.score;
      }

      return a.index - b.index;
    })
    .map(({ player }) => player);
};

export const getCurrentPlayerRanks = (players: Player[]): Record<string, number> => {
  return sortPlayersByRank(players).reduce<Record<string, number>>((ranks, player, index) => {
    return {
      ...ranks,
      [player.id]: index + 1,
    };
  }, {});
};

/**
 * Calculates final scores for the game result.
 *
 * Logic:
 * 1. Rank players by score (Tie-breaker: seating order in RoomState.players)
 * 2. Calculate rounded point for 2nd-4th place:
 *    - Base = Score / 1000
 *    - Target = ReturnPoint / 1000
 *    - If Score < ReturnPoint: Math.ceil(Base) - Target
 *    - If Score >= ReturnPoint: Math.floor(Base) - Target
 * 3. Calculate 1st place point:
 *    - -1 * sum(2nd..4th points)
 * 4. Add Uma
 */
export const calculateFinalScores = (
  players: Player[],
  settings: GameSettings,
  gameId: string,
): GameResult => {
  const sortedPlayers = sortPlayersByRank(players);

  const returnPoint = settings.returnPoint;

  const playerCount = players.length;
  // Temporary storage for calculated points logic
  const tempResults: { id: string; point: number }[] = [];

  // Calculate for Rank 2..N
  for (let i = 1; i < playerCount; i++) {
    const p = sortedPlayers[i];
    const base = p.score / 1000;
    const target = returnPoint / 1000;
    let rounded = 0;

    // User logic:
    // P < R (Origins): Ceil(Base)
    // P >= R: Floor(Base)

    // Note: JS division.
    // Example: 24500 / 1000 = 24.5. Target 30.
    // 24.5 < 30 -> Ceil(24.5) = 25.
    // Result = 25 - 30 = -5.
    // Example: 30500 / 1000 = 30.5. Target 30.
    // 30.5 >= 30 -> Floor(30.5) = 30.
    // Result = 30 - 30 = 0.

    if (p.score < returnPoint) {
      rounded = Math.ceil(base);
    } else {
      rounded = Math.floor(base); // Assuming floor for >=
      // Wait, standard rounding is usually "Round Half Up" or specific "Gochou".
      // User Spec: "原点以上の場合切り捨て" (Floor). okay.
    }

    const finalExUma = rounded - target;
    tempResults.push({ id: p.id, point: finalExUma });
  }

  // Calculate Rank 1
  const sumOthers = tempResults.reduce((acc, curr) => acc + curr.point, 0);
  const topPoint = -1 * sumOthers;

  // const topPlayer = sortedPlayers[0];
  // Verify top calculated implicitly matches logic (just for debug/sanity, but we force balance)

  // Construct Final Results
  const scores: PlayerGameResult[] = sortedPlayers.map((p, index) => {
    const rank = index + 1;
    let basePoint = 0;
    if (rank === 1) {
      basePoint = topPoint;
    } else {
      // Find in tempResults
      basePoint = tempResults.find((r) => r.id === p.id)?.point || 0;
    }

    const umaValue = getUmaPointsByRank(settings.uma, rank, playerCount);
    const totalPoint = basePoint + umaValue;

    // We don't have Game-level chip diff tracking in RoomState easily right now (it's cumulative).
    // So we'll set chipDiff to 0 for now or calculate if we had start snapshot.
    // For MVP version of ResultView, we might omit per-game chip *diff* unless tracked.
    // We will leave it as 0.

    return {
      playerId: p.id,
      name: p.name,
      rank,
      rawScore: p.score,
      point: totalPoint,
      chipDiff: 0,
    };
  });

  return {
    id: gameId,
    timestamp: Date.now(),
    ruleSnapshot: normalizeGameSettings(settings),
    scores,
  };
};

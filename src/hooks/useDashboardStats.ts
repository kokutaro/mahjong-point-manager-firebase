import { useMemo } from 'react';
import type { GameResult, HandLog } from '../types';
import { useAuth } from '../contexts/useAuth';
import { useRoomHistory } from './useRoomHistory';

export interface DashboardStats {
  periodGames: number;
  totalGames: number;
  averageRank: number;
  rankHistory: { rank: number; date: number }[];
  validHands: number;
  winCount: number;
  dealInCount: number;
  riichiCount: number;
  totalWinPoints: number;
  totalDealInPoints: number;
  winsAfterRiichi: number;
  dealInsAfterRiichi: number;
}

const EMPTY_STATS: DashboardStats = {
  periodGames: 0,
  totalGames: 0,
  averageRank: 0,
  rankHistory: [],
  validHands: 0,
  winCount: 0,
  dealInCount: 0,
  riichiCount: 0,
  totalWinPoints: 0,
  totalDealInPoints: 0,
  winsAfterRiichi: 0,
  dealInsAfterRiichi: 0,
};

export const useDashboardStats = () => {
  const { uid } = useAuth();
  const { rooms, loading, error } = useRoomHistory();

  const stats = useMemo<DashboardStats | null>(() => {
    if (!uid) {
      return null;
    }

    let totalGames = 0;
    let totalRank = 0;
    const rankHistory: { rank: number; date: number }[] = [];

    let validHands = 0;
    let winCount = 0;
    let dealInCount = 0;
    let riichiCount = 0;
    let totalWinPoints = 0;
    let totalDealInPoints = 0;
    let winsAfterRiichi = 0;
    let dealInsAfterRiichi = 0;

    const allGames: GameResult[] = rooms.flatMap((room) => room.gameResults ?? []);
    allGames.sort((left, right) => right.timestamp - left.timestamp);

    allGames.forEach((game) => {
      totalGames += 1;
      const myResult = game.scores.find((score) => score.playerId === uid);
      if (myResult) {
        totalRank += myResult.rank;
        rankHistory.push({
          rank: myResult.rank,
          date: game.timestamp,
        });
      }

      (game.logs ?? []).forEach((log: HandLog) => {
        const result = log.result;
        if (result.type === 'Adjustment') {
          return;
        }

        validHands += 1;
        const scoreDelta = result.scoreDeltas[uid] || 0;
        const riichiIds = result.riichiPlayerIds || [];
        const didRiichi = riichiIds.includes(uid);

        if (didRiichi) {
          riichiCount += 1;
        }

        if (result.type === 'Win') {
          const isWinner = result.winners?.some((winner) => winner.id === uid);
          const isLoser = result.loserId === uid;

          if (isWinner) {
            winCount += 1;
            if (scoreDelta > 0) {
              totalWinPoints += scoreDelta;
            }
            if (didRiichi) {
              winsAfterRiichi += 1;
            }
          }

          if (isLoser) {
            dealInCount += 1;
            totalDealInPoints += Math.abs(scoreDelta);
            if (didRiichi) {
              dealInsAfterRiichi += 1;
            }
          }
        }
      });
    });

    return {
      periodGames: totalGames,
      totalGames,
      averageRank: totalGames > 0 ? totalRank / totalGames : 0,
      rankHistory,
      validHands,
      winCount,
      dealInCount,
      riichiCount,
      totalWinPoints,
      totalDealInPoints,
      winsAfterRiichi,
      dealInsAfterRiichi,
    };
  }, [rooms, uid]);

  return {
    stats: uid ? (stats ?? EMPTY_STATS) : null,
    loading,
    error,
  };
};

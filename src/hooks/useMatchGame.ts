import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult, HandLog, Player, RoomState, ScorePayment } from '../types';
import { processHandEnd } from '../utils/gameLogic';
import { generateId } from '../utils/id';
import { calculateFinalScores, distributeRemainingRiichiSticks } from '../utils/resultCalculator';
import { calculateRyukyokuScore } from '../utils/scoreCalculator';
import { calculateTransaction } from '../utils/scoreDiff';
import {
  createRiichiLastEvent,
  createScoreChangeLastEvent,
  getSoundEffectCueFromResults,
} from '../utils/soundEffects';

interface UseMatchGameOptions {
  room: RoomState | null;
  updateState: (updates: Partial<RoomState>) => Promise<void>;
}

export interface UseMatchGameReturn {
  handleScoreConfirm: (
    results: {
      payment: ScorePayment;
      winnerId: string;
      loserId: string | null;
      chips: number;
    }[],
  ) => Promise<HandLog | null>;
  handleRyukyoku: (tenpaiIds: string[]) => Promise<HandLog | null>;
  handleUndo: () => Promise<void>;
  handleRiichi: (playerId: string) => Promise<void>;
  handleStartGame: () => Promise<void>;
  handleReorder: (newPlayers: Player[]) => Promise<void>;
  handleAbortGame: (options: { saveResult: boolean }) => Promise<GameResult | null>;
  isTransitioning: boolean;
  showFinishedModal: boolean;
  extensionOverlay: string | null;
  dismissFinishedModal: () => void;
  gameResult: GameResult | null;
}

export const useMatchGame = ({ room, updateState }: UseMatchGameOptions): UseMatchGameReturn => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const [extensionOverlay, setExtensionOverlay] = useState<string | null>(null);
  const [hasHandledFinish, setHasHandledFinish] = useState(false);

  const prevStatusRef = useRef<RoomState['status'] | undefined>(undefined);
  const prevRoundWindRef = useRef<RoomState['round']['wind'] | undefined>(undefined);
  const skipFinishedTransitionRef = useRef(false);

  // Track latest game result
  const gameResult: GameResult | null =
    room?.gameResults && room.gameResults.length > 0
      ? room.gameResults[room.gameResults.length - 1]
      : null;

  // Finish detection
  useEffect(() => {
    if (room && room.status === 'finished' && !hasHandledFinish) {
      if (skipFinishedTransitionRef.current) {
        skipFinishedTransitionRef.current = false;
        setTimeout(() => {
          setHasHandledFinish(true);
        }, 0);
        return;
      }

      setTimeout(() => {
        setHasHandledFinish(true);
        if (!isTransitioning) {
          setIsTransitioning(true);
          setTimeout(() => setShowFinishedModal(true), 3000);
        }
      }, 0);
    }
  }, [room, room?.status, hasHandledFinish, isTransitioning]);

  useEffect(() => {
    if (room) {
      const current = room.status;
      const prev = prevStatusRef.current;
      if (prev === undefined) {
        prevStatusRef.current = current;
      }
      if (current === 'finished' && prev && prev !== 'finished') {
        if (skipFinishedTransitionRef.current) {
          skipFinishedTransitionRef.current = false;
          prevStatusRef.current = current;
          return;
        }
        if (!isTransitioning) {
          setTimeout(() => {
            setIsTransitioning(true);
            setTimeout(() => setShowFinishedModal(true), 3000);
          }, 0);
        }
      }
      prevStatusRef.current = current;
    }
  }, [room, isTransitioning]);

  // Extension overlay detection
  useEffect(() => {
    if (room) {
      const currentWind = room.round.wind;
      const prevWind = prevRoundWindRef.current;
      if (prevWind && currentWind !== prevWind) {
        setTimeout(() => {
          if (currentWind === 'West') {
            setExtensionOverlay('西入 (West Extension)');
            setTimeout(() => setExtensionOverlay(null), 3000);
          } else if (currentWind === 'North') {
            setExtensionOverlay('北入 (North Extension)');
            setTimeout(() => setExtensionOverlay(null), 3000);
          } else if (currentWind === 'East' && prevWind === 'North') {
            setExtensionOverlay('返り東 (Return to East)');
            setTimeout(() => setExtensionOverlay(null), 3000);
          }
        }, 0);
      }
      prevRoundWindRef.current = currentWind;
    }
  }, [room, room?.round.wind]);

  const triggerGameEndTransition = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => setShowFinishedModal(true), 3000);
  }, []);

  const rotateWinds = (players: Player[], isRenchan: boolean): Player[] => {
    if (isRenchan) return players;
    const windOrder: Player['wind'][] = ['East', 'South', 'West', 'North'];
    const currentEastIdx = players.findIndex((p) => p.wind === 'East');
    if (currentEastIdx === -1) return players;
    const nextEastIdx = (currentEastIdx + 1) % players.length;
    return players.map((p, idx) => {
      const rel = (idx - nextEastIdx + players.length) % players.length;
      return { ...p, wind: windOrder[rel] };
    });
  };

  const handleScoreConfirm = useCallback(
    async (
      results: {
        payment: ScorePayment;
        winnerId: string;
        loserId: string | null;
        chips: number;
      }[],
    ) => {
      if (!room) return null;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { history: _h, ...currentStateSnapshot } = room;
      const newHistory = [...(room.history || []), currentStateSnapshot];

      const { players, round } = room;
      const playerIds = players.map((p) => p.id);
      const dealer = players.find((p) => p.wind === 'East');
      const dealerId = dealer ? dealer.id : players[0].id;

      // Calculate deltas
      const finalDeltas = new Map<
        string,
        { total: number; hand: number; sticks: number; chips: number }
      >();
      playerIds.forEach((id) => finalDeltas.set(id, { total: 0, hand: 0, sticks: 0, chips: 0 }));

      let remainingRiichi = Number(round.riichiSticks) || 0;
      const remainingHonba = Number(round.honba) || 0;

      results.forEach((res, index) => {
        const sticksToTake = index === 0 ? remainingRiichi : 0;
        const honbaToTake = index === 0 ? remainingHonba : 0;
        if (index === 0) remainingRiichi = 0;

        const tx = calculateTransaction(
          res.payment,
          res.winnerId,
          res.loserId,
          playerIds,
          dealerId,
          honbaToTake,
          sticksToTake,
        );

        // Chip calculation
        const isTsumo = !res.loserId;
        const chipCount = res.chips;
        const chipDeltas = new Map<string, number>();
        playerIds.forEach((id) => chipDeltas.set(id, 0));

        if (chipCount !== 0) {
          if (isTsumo) {
            const loserIds = playerIds.filter((id) => id !== res.winnerId);
            chipDeltas.set(res.winnerId, chipCount * loserIds.length);
            loserIds.forEach((id) => chipDeltas.set(id, -chipCount));
          } else if (res.loserId) {
            chipDeltas.set(res.winnerId, chipCount);
            chipDeltas.set(res.loserId, -chipCount);
          }
        }

        tx.deltas.forEach((d) => {
          const current = finalDeltas.get(d.playerId)!;
          const chipChange = chipDeltas.get(d.playerId) || 0;
          finalDeltas.set(d.playerId, {
            total: current.total + d.total,
            hand: current.hand + d.hand,
            sticks: current.sticks + d.sticks,
            chips: current.chips + chipChange,
          });
        });
      });

      const newPlayers = players.map((p) => {
        const d = finalDeltas.get(p.id)!;
        return { ...p, score: p.score + d.total, chip: p.chip + d.chips, isRiichi: false };
      });

      // LastEvent
      const lastEventDeltas: Record<string, { hand: number; sticks: number; chips?: number }> = {};
      const scoreDeltas: Record<string, number> = {};
      finalDeltas.forEach((val, key) => {
        if (val.total !== 0 || val.chips !== 0) {
          lastEventDeltas[key] = { hand: val.hand, sticks: val.sticks, chips: val.chips };
        }
        scoreDeltas[key] = val.total;
      });

      const lastEvent = createScoreChangeLastEvent(
        generateId(12),
        lastEventDeltas,
        getSoundEffectCueFromResults(results) ?? undefined,
      );

      // HandLog
      const newLog: HandLog = {
        id: generateId(12),
        timestamp: Date.now(),
        round: { ...round, riichiSticks: remainingRiichi },
        result: {
          type: 'Win',
          winners: results.map((r) => ({ id: r.winnerId, payment: r.payment })),
          loserId: results[0].loserId,
          riichiPlayerIds: players.filter((p) => p.isRiichi).map((p) => p.id),
          scoreDeltas,
        },
      };
      const nextLogs = [...(room.currentLogs || []), newLog];

      // Process hand end
      const handResult = {
        type: 'Win' as const,
        winners: results.map((r) => ({ ...r, id: r.winnerId })),
        loserId: results[0].loserId,
      };
      const nextState = processHandEnd(
        {
          players: newPlayers,
          round,
          id: room.id,
          hostId: room.hostId,
          status: room.status,
          settings: room.settings,
          playerIds: room.playerIds,
        },
        handResult,
      );

      const nextStatus = nextState.isGameOver ? 'finished' : room.status;

      let nextGameResults = room.gameResults || [];
      if (nextState.isGameOver) {
        const result = calculateFinalScores(newPlayers, room.settings, generateId(12), {
          handLogs: nextLogs,
        });
        result.logs = nextLogs;
        nextGameResults = [...nextGameResults, result];
      }

      // Wind rotation
      const isRenchan =
        nextState.nextRound.wind === round.wind && nextState.nextRound.number === round.number;
      const nextPlayersWithWind = rotateWinds(newPlayers, isRenchan);

      if (nextState.isGameOver) triggerGameEndTransition();

      await updateState({
        players: nextPlayersWithWind,
        round: nextState.isGameOver
          ? { ...round, riichiSticks: remainingRiichi }
          : { ...nextState.nextRound, riichiSticks: remainingRiichi },
        status: nextStatus as RoomState['status'],
        history: newHistory as RoomState[],
        lastEvent,
        gameResults: nextGameResults,
        currentLogs: nextState.isGameOver ? [] : nextLogs,
      });

      return newLog;
    },
    [room, updateState, triggerGameEndTransition],
  );

  const handleRyukyoku = useCallback(
    async (tenpaiIds: string[]) => {
      if (!room) return null;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { history: _h, ...currentStateSnapshot } = room;
      const newHistory = [...(room.history || []), currentStateSnapshot];

      const mode = room.settings.mode || '4ma';
      const notenIds = room.players.filter((p) => !tenpaiIds.includes(p.id)).map((p) => p.id);
      const { tenpai, noten } = calculateRyukyokuScore(tenpaiIds.length, notenIds.length, mode);

      const lastEventDeltas: Record<string, { hand: number; sticks: number }> = {};
      const newPlayers = room.players.map((p) => {
        const delta = tenpaiIds.includes(p.id) ? tenpai : noten;
        if (delta !== 0) {
          lastEventDeltas[p.id] = { hand: delta, sticks: 0 };
        }
        return { ...p, score: p.score + delta, isRiichi: false };
      });

      const lastEvent = createScoreChangeLastEvent(generateId(12), lastEventDeltas);

      const scoreDeltas: Record<string, number> = {};
      room.players.forEach((p) => {
        const np = newPlayers.find((np) => np.id === p.id);
        if (np) scoreDeltas[p.id] = np.score - p.score;
      });

      const newLog: HandLog = {
        id: generateId(12),
        timestamp: Date.now(),
        round: { ...room.round },
        result: {
          type: 'Draw',
          tenpaiPlayerIds: tenpaiIds,
          riichiPlayerIds: room.players.filter((p) => p.isRiichi).map((p) => p.id),
          scoreDeltas,
        },
      };
      const nextLogs = [...(room.currentLogs || []), newLog];

      const handResult = { type: 'Draw' as const, tenpaiPlayerIds: tenpaiIds };
      const nextState = processHandEnd(
        {
          players: newPlayers,
          round: room.round,
          id: room.id,
          hostId: room.hostId,
          status: room.status,
          settings: room.settings,
          playerIds: room.playerIds,
        },
        handResult,
      );

      const nextStatus = nextState.isGameOver ? 'finished' : room.status;

      let nextGameResults = room.gameResults || [];
      if (nextState.isGameOver) {
        const result = calculateFinalScores(newPlayers, room.settings, generateId(12), {
          handLogs: nextLogs,
        });
        result.logs = nextLogs;
        nextGameResults = [...nextGameResults, result];
      }

      const isRenchan =
        nextState.nextRound.wind === room.round.wind &&
        nextState.nextRound.number === room.round.number;
      const nextPlayersWithWind = rotateWinds(newPlayers, isRenchan);

      if (nextState.isGameOver) triggerGameEndTransition();

      await updateState({
        players: nextPlayersWithWind,
        round: nextState.isGameOver ? { ...room.round } : nextState.nextRound,
        status: nextStatus as RoomState['status'],
        history: newHistory as RoomState[],
        lastEvent,
        gameResults: nextGameResults,
        currentLogs: nextState.isGameOver ? [] : nextLogs,
      });

      return newLog;
    },
    [room, updateState, triggerGameEndTransition],
  );

  const handleUndo = useCallback(async () => {
    if (!room || !room.history || room.history.length === 0) return;
    const lastState = room.history[room.history.length - 1];
    const newHistory = room.history.slice(0, -1);
    await updateState({ ...lastState, history: newHistory, lastEvent: undefined });
  }, [room, updateState]);

  const handleRiichi = useCallback(
    async (playerId: string) => {
      if (!room) return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { history: _h, ...snapshot } = room;
      const newHistory = [...(room.history || []), snapshot];
      const newPlayers = room.players.map((p) =>
        p.id === playerId ? { ...p, score: p.score - 1000, isRiichi: true } : p,
      );
      const newRound = { ...room.round, riichiSticks: room.round.riichiSticks + 1 };
      await updateState({
        players: newPlayers,
        round: newRound,
        history: newHistory as RoomState[],
        lastEvent: createRiichiLastEvent(generateId(12), playerId),
      });
    },
    [room, updateState],
  );

  const handleStartGame = useCallback(async () => {
    await updateState({ status: 'playing' });
  }, [updateState]);

  const handleReorder = useCallback(
    async (newPlayers: Player[]) => {
      const windOrder: Player['wind'][] = ['East', 'South', 'West', 'North'];
      const updatedPlayers = newPlayers.map((p, idx) => ({
        ...p,
        wind: windOrder[idx] || 'North',
      }));
      await updateState({ players: updatedPlayers });
    },
    [updateState],
  );

  const handleAbortGame = useCallback(
    async (options: { saveResult: boolean }): Promise<GameResult | null> => {
      if (!room) return null;

      const riichiSticks = room.round.riichiSticks || 0;
      // Distribute remaining riichi sticks to 1st place and reset isRiichi
      const playersWithSticks = distributeRemainingRiichiSticks(room.players, riichiSticks).map(
        (p) => ({ ...p, isRiichi: false }),
      );

      let nextGameResults = room.gameResults || [];
      let result: GameResult | null = null;

      if (options.saveResult) {
        result = calculateFinalScores(playersWithSticks, room.settings, generateId(12), {
          gameEndReason: 'Aborted',
          handLogs: room.currentLogs || [],
        });
        result.logs = room.currentLogs || [];
        nextGameResults = [...nextGameResults, result];
      }

      // Abort flow does not need score animation wait; skip finish transition once.
      skipFinishedTransitionRef.current = true;
      setHasHandledFinish(true);
      setIsTransitioning(false);
      setShowFinishedModal(false);

      await updateState({
        players: playersWithSticks,
        round: { ...room.round, riichiSticks: 0 },
        status: 'finished',
        gameResults: nextGameResults,
        currentLogs: [],
      });

      return result;
    },
    [room, updateState],
  );

  const dismissFinishedModal = useCallback(() => {
    setShowFinishedModal(false);
    setIsTransitioning(false);
  }, []);

  return {
    handleScoreConfirm,
    handleRyukyoku,
    handleUndo,
    handleRiichi,
    handleStartGame,
    handleReorder,
    handleAbortGame,
    isTransitioning,
    showFinishedModal,
    extensionOverlay,
    dismissFinishedModal,
    gameResult,
  };
};

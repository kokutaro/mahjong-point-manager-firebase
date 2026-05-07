import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AdjustmentModal } from '../components/features/AdjustmentModal';
import { AnalysisEventList } from '../components/features/AnalysisEventList';
import {
  AnalysisEventModalLauncher,
  type AnalysisModalSelection,
} from '../components/features/AnalysisEventModalLauncher';
import { LobbyView } from '../components/features/LobbyView';
import { MatchFinishedModal } from '../components/features/MatchFinishedModal';
import { ResultView } from '../components/features/ResultView';
import { ScoreBoard } from '../components/features/ScoreBoard';
import { ScoringModal } from '../components/features/ScoringModal';
import { SessionHistoryTable } from '../components/features/SessionHistoryTable';
import { SettlementModal } from '../components/features/SettlementModal';
import { SoundEffectToggle } from '../components/features/SoundEffectToggle';
import { Button } from '../components/ui/Button';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAnalysisEntries } from '../hooks/useAnalysisEntries';
import { useRoomSoundEffects } from '../hooks/useRoomSoundEffects';
import { useRoom } from '../hooks/useRoom';
import { auth } from '../services/firebase';
import type { HandLog, Player, RoomState, ScorePayment } from '../types';
import type { AdjustmentParams } from '../utils/adjustment';
import { applyAdjustment } from '../utils/adjustment';
import { getAnalysisEventType } from '../utils/analysis';
import { buildRoomAnalysisEvents } from '../utils/analysisEvents';
import { processHandEnd } from '../utils/gameLogic';
import { generateId } from '../utils/id';
import {
  calculateFinalScores,
  distributeRemainingRiichiSticks,
  getWinnerIdSetFromLogs,
} from '../utils/resultCalculator';
import { calculateRyukyokuScore } from '../utils/scoreCalculator';
import { calculateTransaction } from '../utils/scoreDiff';
import { isReadOnlyFinishedCompetitionRoom } from '../utils/historyRoomStatus';
import {
  createRiichiLastEvent,
  createScoreChangeLastEvent,
  getSoundEffectCueFromResults,
} from '../utils/soundEffects';

export const MatchPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { room, loading, join, updateState } = useRoom(roomId || '');

  // Local user ID (Auth)
  const [myPlayerId] = useState<string>(() => {
    // Auth should be ready due to App.tsx guard
    return auth.currentUser?.uid || '';
  });
  const [joinName, setJoinName] = useState(() => localStorage.getItem('mahjong_player_name') || '');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Game End Transition States
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const prevStatusRef = useRef<RoomState['status'] | undefined>(undefined);
  const skipFinishedTransitionRef = useRef(false);

  // Track if we have handled the finish state
  const [hasHandledFinish, setHasHandledFinish] = useState(false);

  const [isEndMatchConfirmOpen, setIsEndMatchConfirmOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isAbortConfirmOpen, setIsAbortConfirmOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [analysisSelection, setAnalysisSelection] = useState<AnalysisModalSelection | null>(null);
  const { isSoundEnabled, setIsSoundEnabled } = useRoomSoundEffects(room?.lastEvent);
  const { entries: analysisEntries } = useAnalysisEntries();

  const savedHandLogIds = useMemo(() => {
    return new Set(analysisEntries.map((entry) => entry.source.handLogId));
  }, [analysisEntries]);

  const analysisEvents = useMemo(() => {
    if (!room) {
      return [];
    }

    return buildRoomAnalysisEvents(room, myPlayerId);
  }, [myPlayerId, room]);

  const yakitoriPlayerIds = useMemo(() => {
    if (!room?.settings.yakitoriEnabled) {
      return undefined;
    }
    const winnerIds = getWinnerIdSetFromLogs(room.currentLogs ?? []);
    const yakitoriIds = new Set<string>();
    for (const player of room.players) {
      if (!winnerIds.has(player.id)) {
        yakitoriIds.add(player.id);
      }
    }
    return yakitoriIds;
  }, [room]);

  const promptAnalysisForHand = (handLog: HandLog, playersSnapshot: Player[]) => {
    if (!room || !getAnalysisEventType(handLog, myPlayerId)) {
      return;
    }

    const selection: AnalysisModalSelection = {
      handLog,
      source: {
        kind: 'room',
        roomId: room.id,
        handLogId: handLog.id,
      },
      players: playersSnapshot,
    };

    showSnackbar('この局の分析メモを残せます。', {
      actionLabel: '開く',
      autoHideDuration: 5000,
      onAction: () => setAnalysisSelection(selection),
    });
  };

  useEffect(() => {
    if (room && room.status === 'finished' && !hasHandledFinish) {
      if (skipFinishedTransitionRef.current) {
        skipFinishedTransitionRef.current = false;
        setTimeout(() => {
          setHasHandledFinish(true);
        }, 0);
        return;
      }

      // Wrap in timeout to avoid synchronous setState in effect (lint warning)
      setTimeout(() => {
        setHasHandledFinish(true);
        if (!isTransitioning) {
          setIsTransitioning(true);
          setTimeout(() => {
            setShowFinishedModal(true);
          }, 3000);
        }
      }, 0);
    }
  }, [room, room?.status, hasHandledFinish, isTransitioning]);

  useEffect(() => {
    if (room) {
      const current = room.status;
      const prev = prevStatusRef.current;

      // Init ref on first valid load if undefined
      if (prev === undefined) {
        prevStatusRef.current = current;
        // Also init round ref
      }

      // Detect change to finished
      if (current === 'finished' && prev && prev !== 'finished') {
        if (skipFinishedTransitionRef.current) {
          skipFinishedTransitionRef.current = false;
          prevStatusRef.current = current;
          return;
        }

        // If not already transitioning (self-triggered), trigger it now
        if (!isTransitioning) {
          // Trigger logic inline to avoid dependency issues or use function ref
          setTimeout(() => {
            setIsTransitioning(true);
            setTimeout(() => {
              setShowFinishedModal(true);
            }, 3000);
          }, 0);
        }
      }

      prevStatusRef.current = current;
    }
  }, [room, isTransitioning]);

  // Extension Notification Logic
  const [extensionOverlay, setExtensionOverlay] = useState<string | null>(null);
  const prevRoundWindRef = useRef<RoomState['round']['wind'] | undefined>(undefined);

  useEffect(() => {
    if (room) {
      const currentWind = room.round.wind;
      const prevWind = prevRoundWindRef.current;

      if (prevWind && currentWind !== prevWind) {
        // Detect entry to West/North/Return-East
        // Wrap in timeout to avoid sync setState error
        setTimeout(() => {
          if (currentWind === 'West') {
            setExtensionOverlay('西入 (West Extension)');
            setTimeout(() => setExtensionOverlay(null), 3000);
          } else if (currentWind === 'North') {
            if (room.settings.mode === '4ma') {
              setExtensionOverlay('北入 (North Extension)');
            } else {
              // 3ma entering North might be extension if length=Hanchan?
              // Typically 3ma Hanchan ends after South. So North is Extension.
              setExtensionOverlay('北入 (North Extension)');
            }
            setTimeout(() => setExtensionOverlay(null), 3000);
          } else if (currentWind === 'East' && prevWind === 'North') {
            setExtensionOverlay('返り東 (Return to East)');
            setTimeout(() => setExtensionOverlay(null), 3000);
          }
        }, 0);
      }
      prevRoundWindRef.current = currentWind;
    }
  }, [room, room?.round.wind, room?.settings.mode]);

  // Check if I need to join
  useEffect(() => {
    if (room && !loading) {
      const isJoined = room.players.some((p) => p.id === myPlayerId);
      if (!isJoined && room.players.length < (room.settings.mode === '4ma' ? 4 : 3)) {
        setTimeout(() => setIsJoinModalOpen(true), 0);
      }
    }
  }, [room, loading, myPlayerId]);

  const handleJoinSubmit = async () => {
    if (!joinName.trim()) return;
    localStorage.setItem('mahjong_player_name', joinName);

    // Determine info
    const winds: ('East' | 'South' | 'West' | 'North')[] = ['East', 'South', 'West', 'North'];
    // Assign next available wind
    // Simple logic: room.players.length -> index
    const assignedWind = winds[room?.players.length || 0];

    try {
      await join({
        id: myPlayerId,
        name: joinName,
        score: room?.settings.startPoint ?? 25000,
        wind: assignedWind,
        isRiichi: false,
        chip: 0,
      });
      setIsJoinModalOpen(false);
    } catch {
      showSnackbar('Join failed');
    }
  };

  const [selectedLoserId, setSelectedLoserId] = useState<string | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialWinType, setInitialWinType] = useState<'Ron' | 'Tsumo' | 'Ryukyoku'>('Ron');

  const handlePlayerClick = (id: string) => {
    if (!room) return;

    // Always treat the clicked player as the Winner
    setSelectedWinnerId(id);
    setSelectedLoserId(null);
    setInitialWinType('Ron');
    setIsModalOpen(true);
  };

  const handleCenterClick = () => {
    if (!room) return;
    setInitialWinType('Ryukyoku');
    setIsModalOpen(true);
  };

  const handleUndo = async () => {
    if (!room || !room.history || room.history.length === 0) return;
    const lastState = room.history[room.history.length - 1];
    const newHistory = room.history.slice(0, -1);

    await updateState({
      ...lastState,
      history: newHistory,
      lastEvent: undefined,
    });
  };

  const handleAdjustment = async (params: AdjustmentParams) => {
    if (!room) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { history: _h, ...snapshot } = room;
    const newHistory = [...(room.history || []), snapshot];

    const { newPlayers, handLog, scoreDeltas } = applyAdjustment(room.players, room.round, params);

    const lastEventDeltas: Record<string, { hand: number; sticks: number }> = {};
    Object.entries(scoreDeltas).forEach(([id, delta]) => {
      if (delta !== 0) {
        lastEventDeltas[id] = { hand: delta, sticks: 0 };
      }
    });
    const lastEvent = createScoreChangeLastEvent(generateId(12), lastEventDeltas);

    const nextLogs = [...(room.currentLogs || []), handLog];

    // Tobi (Bankruptcy) check
    const isBankruptcy = room.settings.useTobi && newPlayers.some((p) => p.score < 0);
    let nextGameResults = room.gameResults || [];
    if (isBankruptcy) {
      const result = calculateFinalScores(newPlayers, room.settings, generateId(12), {
        handLogs: nextLogs,
      });
      result.logs = nextLogs;
      nextGameResults = [...nextGameResults, result];
      triggerGameEndTransition();
    }

    await updateState({
      players: newPlayers,
      history: newHistory as RoomState[],
      lastEvent,
      currentLogs: isBankruptcy ? [] : nextLogs,
      ...(isBankruptcy ? { status: 'finished' as const, gameResults: nextGameResults } : {}),
    });

    setIsAdjustmentOpen(false);
  };

  const triggerGameEndTransition = () => {
    setIsTransitioning(true);
    // Wait for score animation (approx 3s includes fade etc)
    // Animation is: Hand(0.8) + Pause(0.4) + Stick(0.8) = 2.0s. + Fade out delay.
    // Let's give it 3.0s to be safe and visible.
    setTimeout(() => {
      setShowFinishedModal(true);
    }, 3000);
  };

  // Handle Stepper Confirm (Possible multiple winners)
  const handleScoreConfirm = async (
    results: {
      payment: ScorePayment;
      winnerId: string;
      loserId: string | null;
      chips: number;
    }[],
  ) => {
    if (!room) return;

    // Snapshot current state for History
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { history: _h, ...currentStateSnapshot } = room;
    // Append to history
    // We should limit history size ideally
    const newHistory = [...(room.history || []), currentStateSnapshot];

    const players = room.players;
    const round = room.round;

    const playerIds = players.map((p) => p.id);
    const dealer = players.find((p) => p.wind === 'East');
    const dealerId = dealer ? dealer.id : players[0].id;

    // Calculate Diffs
    // Calculate Diffs
    const finalDeltas = new Map<
      string,
      { total: number; hand: number; sticks: number; chips: number }
    >();
    playerIds.forEach((id) => finalDeltas.set(id, { total: 0, hand: 0, sticks: 0, chips: 0 }));

    let remainingRiichi = Number(round.riichiSticks) || 0;
    // eslint-disable-next-line prefer-const
    let remainingHonba = Number(round.honba) || 0;

    results.forEach((res, index) => {
      const sticksToTake = index === 0 ? remainingRiichi : 0;
      const honbaToTake = index === 0 ? remainingHonba : 0;

      if (index === 0) {
        remainingRiichi = 0;
      }

      const tx = calculateTransaction(
        res.payment,
        res.winnerId,
        res.loserId,
        playerIds,
        dealerId,
        honbaToTake,
        sticksToTake,
      );

      // Chip Calculation
      const isTsumo = !res.loserId;
      const chipCount = res.chips;
      const chipDeltas = new Map<string, number>();
      playerIds.forEach((id) => chipDeltas.set(id, 0));

      if (chipCount !== 0) {
        if (isTsumo) {
          // Tsumo: All others pay to Winner
          // Winner gets: chipCount * (players - 1)
          // Others lose: chipCount
          const loserIds = playerIds.filter((id) => id !== res.winnerId);
          chipDeltas.set(res.winnerId, chipCount * loserIds.length);
          loserIds.forEach((id) => chipDeltas.set(id, -chipCount));
        } else {
          // Ron: Loser pays Winner
          if (res.loserId) {
            chipDeltas.set(res.winnerId, chipCount);
            chipDeltas.set(res.loserId, -chipCount);
          }
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
      return {
        ...p,
        score: p.score + d.total,
        chip: p.chip + d.chips,
        isRiichi: false,
      };
    });

    // Create LastEvent
    const lastEventDeltas: Record<string, { hand: number; sticks: number; chips?: number }> = {};
    const scoreDeltas: Record<string, number> = {};

    finalDeltas.forEach((val, key) => {
      if (val.total !== 0 || val.chips !== 0) {
        lastEventDeltas[key] = {
          hand: val.hand,
          sticks: val.sticks,
          chips: val.chips,
        };
      }
      scoreDeltas[key] = val.total;
    });

    const lastEvent = createScoreChangeLastEvent(
      generateId(12),
      lastEventDeltas,
      getSoundEffectCueFromResults(results) ?? undefined,
    );

    // Create Log
    const newLog: HandLog = {
      id: generateId(12),
      timestamp: Date.now(),
      round: { ...round, riichiSticks: remainingRiichi }, // Log status at moment of win (sticks included?) Or before?
      // Ideally log the round that JUST finished. `round` variable is correct.
      // Sticks: `round.riichiSticks` is the sticks on table.
      // NOTE: `round` is const from room.round. It has current sticks.

      result: {
        type: 'Win',
        winners: results.map((r) => ({
          id: r.winnerId,
          payment: r.payment,
        })),
        loserId: results[0].loserId,
        riichiPlayerIds: players.filter((p) => p.isRiichi).map((p) => p.id),
        scoreDeltas,
      },
    };

    const nextLogs = [...(room.currentLogs || []), newLog];

    // Reset Riichi flags for next hand
    // Note: The `isRiichi` boolean on player    const isDealerWin = results.some(r => r.winnerId === dealerId);

    // Prepare result object for logic
    // We assume 'Win' for now as this function is handleScoreConfirm (which implies win or explicit draw?)
    // Ah, handleScoreConfirm handles BOTH? The signature says results have payment.
    // If it's a Draw, we need a different handler or adapting this.
    // Spec: Step 1 allows Tsumo/Ron.
    // Wait, Ryukyoku is different. We don't have Ryukyoku UI yet in ScoringModal.
    // ScoringModal is for "Scoring" (Win).
    // The current UI flow has no "Draw" button.
    // For now, let's implement the Win logic correctly using the new function.

    const handResult = {
      type: 'Win' as const,
      winners: results.map((r) => ({ ...r, id: r.winnerId })),
      loserId: results[0].loserId, // Common loser for all (simplified for multi-ron)
    };

    const nextState = processHandEnd(
      {
        players: newPlayers,
        round,
        id: room.id,
        hostId: room.hostId,
        status: room.status,
        settings: room.settings,
        playerIds: room.playerIds, // Pass through
      },
      handResult,
    );

    const nextStatus = nextState.isGameOver ? 'finished' : room.status;

    // If game over, calculate result
    let nextGameResults = room.gameResults || [];
    if (nextState.isGameOver) {
      // Use newPlayers (scores updated) for calculation
      // Note: nextState.nextRound might not be relevant for score calc
      const result = calculateFinalScores(newPlayers, room.settings, generateId(12), {
        handLogs: nextLogs,
      });
      result.logs = nextLogs; // Attach logs
      nextGameResults = [...nextGameResults, result];
    }

    // Wind Rotation Block
    // Logic: If NOT Renchan, Rotate.
    let nextPlayersWithWind = newPlayers;

    // Check if dealer changed (Renchan logic is internal to processHandEnd, but we can see if round count/wind changed)
    const isRenchan =
      nextState.nextRound.wind === round.wind && nextState.nextRound.number === round.number;

    if (!isRenchan) {
      // Rotate Winds
      const windOrder: Player['wind'][] = ['East', 'South', 'West', 'North'];
      // Find current East
      const currentEastIdx = newPlayers.findIndex((p) => p.wind === 'East');
      if (currentEastIdx !== -1) {
        const nextEastIdx = (currentEastIdx + 1) % newPlayers.length;
        nextPlayersWithWind = newPlayers.map((p, idx) => {
          // relative to next East
          const rel = (idx - nextEastIdx + newPlayers.length) % newPlayers.length;
          return { ...p, wind: windOrder[rel] };
        });
      }
    }

    if (nextState.isGameOver) {
      triggerGameEndTransition();
    }

    await updateState({
      players: nextPlayersWithWind,
      // If Game Over, do NOT advance round (prevents "West 1" display).
      // Keep current round wind/number, but update sticks/honba if necessary (though usually game end means cleared).
      // Actually, if Game Over, we just keep current round as is visually.
      // But we should update riichiSticks to remainingRiichi (which is 0 if taken).
      round: nextState.isGameOver
        ? { ...round, riichiSticks: remainingRiichi }
        : { ...nextState.nextRound, riichiSticks: remainingRiichi },
      status: nextStatus as RoomState['status'],
      history: newHistory as RoomState[],
      lastEvent: lastEvent,
      gameResults: nextGameResults,
      currentLogs: nextState.isGameOver ? [] : nextLogs,
    });

    promptAnalysisForHand(newLog, players);

    setIsModalOpen(false);
  };

  const handleRyukyoku = async (tenpaiIds: string[]) => {
    if (!room) return;

    // 1. History Snapshot
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { history: _h, ...currentStateSnapshot } = room;
    const newHistory = [...(room.history || []), currentStateSnapshot];

    // 2. Score Calculation
    const mode = room.settings.mode || '4ma';
    const notenIds = room.players.filter((p) => !tenpaiIds.includes(p.id)).map((p) => p.id);

    const { tenpai, noten } = calculateRyukyokuScore(tenpaiIds.length, notenIds.length, mode);

    // 3. Update Players & LastEvent
    const lastEventDeltas: Record<string, { hand: number; sticks: number }> = {};

    const newPlayers = room.players.map((p) => {
      let delta = 0;
      if (tenpaiIds.includes(p.id)) delta = tenpai;
      else delta = noten;

      if (delta !== 0) {
        lastEventDeltas[p.id] = { hand: delta, sticks: 0 };
      }

      return { ...p, score: p.score + delta, isRiichi: false }; // Reset riichi flag
    });

    const lastEvent = createScoreChangeLastEvent(generateId(12), lastEventDeltas);

    // Create Log (Ryukyoku)
    const scoreDeltas: Record<string, number> = {};
    room.players.forEach((p) => {
      // Calculate delta: newScore - oldScore
      // newPlayers has updated score.
      const np = newPlayers.find((np) => np.id === p.id);
      if (np) {
        scoreDeltas[p.id] = np.score - p.score;
      }
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

    // 4. Logic for Next Round (Dealer Rotation, Honba, Stick Carryover)
    // Note: Sticks are carried over on Draw. Logic says `processHandEnd` handles logic state,
    // but actual sticking display needs to persist. `nextState.nextRound.riichiSticks` should reuse current.
    // Let's check logic: processHandEnd returns nextRound.
    // Logic currently says `nextRound = { ...round }`. Riichi sticks are copied.
    // So we just rely on logic's return for next round state, except ensuring we pass current sticks correctly.

    const handResult = {
      type: 'Draw' as const,
      tenpaiPlayerIds: tenpaiIds,
    };

    const nextState = processHandEnd(
      {
        players: newPlayers, // Logic checks for Dealer Tenpai etc via ID.
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

    // 5. Player Wind Rotation (Copied from Score Confirm logic)
    // Common Rotation Logic should be refactored potentially but inline is fine.
    let nextPlayersWithWind = newPlayers;
    const isRenchan =
      nextState.nextRound.wind === room.round.wind &&
      nextState.nextRound.number === room.round.number;

    if (!isRenchan) {
      const windOrder: Player['wind'][] = ['East', 'South', 'West', 'North'];
      const currentEastIdx = newPlayers.findIndex((p) => p.wind === 'East');
      if (currentEastIdx !== -1) {
        const nextEastIdx = (currentEastIdx + 1) % newPlayers.length;
        nextPlayersWithWind = newPlayers.map((p, idx) => {
          const rel = (idx - nextEastIdx + newPlayers.length) % newPlayers.length;
          return { ...p, wind: windOrder[rel] };
        });
      }
    }

    if (nextState.isGameOver) {
      triggerGameEndTransition();
    }

    await updateState({
      players: nextPlayersWithWind,
      // If Game Over, keep current round visually (prevents "West 1" jump).
      round: nextState.isGameOver ? { ...room.round } : nextState.nextRound,
      status: nextStatus as RoomState['status'],
      history: newHistory as RoomState[],
      lastEvent: lastEvent,
      gameResults: nextGameResults,
      currentLogs: nextState.isGameOver ? [] : nextLogs,
    });

    promptAnalysisForHand(newLog, room.players);

    setIsModalOpen(false);
  };

  const handleNextGame = async () => {
    if (!room) return;

    // Move to Lobby -> Waiting
    // Reset Scores
    // But keep players (order preserved for now, let host dragging change it)
    // Wind Reset?
    // In Lobby, we will re-assign winds based on order.
    // So we just need to reset numerical values.

    const newPlayers = room.players.map((p) => {
      return {
        ...p,
        score: room.settings.startPoint,
        isRiichi: false,
        // chip: p.chip // Chips preserved? Usually yes.
      };
    });

    await updateState({
      players: newPlayers,
      round: {
        wind: 'East',
        number: 1,
        honba: 0,
        riichiSticks: 0,
      },
      status: 'waiting', // Go to Lobby
      history: [], // Clear undo history
      currentLogs: [], // Clear logs
      // leave gameResults as is
    });
  };

  // Lobby Handlers
  const handleLobbyReorder = async (newPlayers: Player[]) => {
    // Logic: Update winds based on New Order (0=East, 1=South...)
    const windOrder: Player['wind'][] = ['East', 'South', 'West', 'North'];
    const updatedPlayers = newPlayers.map((p, idx) => ({
      ...p,
      wind: windOrder[idx] || 'North', // Fallback
    }));

    await updateState({
      players: updatedPlayers,
    });
  };

  const handleStartGame = async () => {
    // Just set status to playing
    await updateState({
      status: 'playing',
    });
  };

  if (loading) return <div>Loading Room...</div>;
  if (!room)
    return (
      <div>
        Room not found or error. <Button onClick={() => navigate('/')}>Top</Button>
      </div>
    );

  if (isReadOnlyFinishedCompetitionRoom(room)) {
    return <Navigate replace to={`/history/${room.id}`} />;
  }

  // Render Lobby
  if (room.status === 'waiting') {
    return (
      <>
        <LobbyView
          room={room}
          currentUserId={myPlayerId}
          onReorder={handleLobbyReorder}
          onStartGame={handleStartGame}
        />
        {/* Join Modal */}
        <Modal isOpen={isJoinModalOpen} onClose={() => {}} title="Join Room">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label>Your Name</label>
            <Input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              style={{ fontSize: '16px' }}
            />
            <Button onClick={handleJoinSubmit} disabled={!joinName}>
              Join Game
            </Button>
          </div>
        </Modal>
      </>
    );
  }

  const handleEndMatch = async () => {
    setIsEndMatchConfirmOpen(true);
  };

  const handleEndMatchConfirm = () => {
    setIsEndMatchConfirmOpen(false);
    setIsSettlementOpen(true);
  };

  const handleAbortGame = async (saveResult: boolean) => {
    if (!room) return;
    setIsAbortConfirmOpen(false);

    const riichiSticks = room.round.riichiSticks || 0;
    // Distribute remaining riichi sticks to 1st place and reset isRiichi
    const playersWithSticks = distributeRemainingRiichiSticks(room.players, riichiSticks).map(
      (p) => ({ ...p, isRiichi: false }),
    );

    let nextGameResults = room.gameResults || [];
    if (saveResult) {
      const result = calculateFinalScores(playersWithSticks, room.settings, generateId(12), {
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
  };

  const handleSettlementClose = async () => {
    if (!room) return;
    await updateState({
      status: 'ended',
    });
    setIsSettlementOpen(false);
    navigate('/');
  };

  if (
    (room.status === 'finished' && !isTransitioning && hasHandledFinish) ||
    room.status === 'ended'
  ) {
    // Only show ResultView if we are finished, not transitioning, AND we have already handled the finish trigger (meaning the modal flow is done)
    // OR if status is 'ended' (read-only)
    return (
      <>
        <ResultView room={room} onNextGame={handleNextGame} onEndMatch={handleEndMatch} />
        <ConfirmationDialog
          isOpen={isEndMatchConfirmOpen}
          onConfirm={handleEndMatchConfirm}
          onCancel={() => setIsEndMatchConfirmOpen(false)}
          title="対局終了の確認"
          message={'この対局を終了しますか？\n終了後は閲覧のみ可能になります。'}
          type="danger"
          confirmText="終了する"
        />
        <SettlementModal
          isOpen={isSettlementOpen}
          onClose={handleSettlementClose}
          players={room.players}
          gameResults={room.gameResults || []}
          rate={room.settings.rate || 0}
        />
      </>
    );
  }

  const currentDealer = room.players.find((p) => p.wind === 'East');

  return (
    <div
      style={{
        padding: '16px',
        maxWidth: '600px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Room: {room.id}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="small"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              showSnackbar('Copied URL', {
                position: 'top',
                autoHideDuration: 2000,
              });
            }}
          >
            Share
          </Button>
          <Button size="small" variant="secondary" onClick={() => setIsMenuOpen(true)}>
            Menu
          </Button>
        </div>
      </div>

      <ScoreBoard
        players={room.players}
        round={room.round}
        lastEvent={room.lastEvent}
        currentUserId={myPlayerId}
        onPlayerClick={handlePlayerClick}
        onRiichi={async (playerId) => {
          if (!room) return;
          // Validate again securely? Logic should be consistent currently.
          // Create Snapshot
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { history: _h, ...snapshot } = room;
          const newHistory = [...(room.history || []), snapshot];

          // Update
          const newPlayers = room.players.map((p) => {
            if (p.id === playerId) {
              return { ...p, score: p.score - 1000, isRiichi: true };
            }
            return p;
          });
          const newRound = {
            ...room.round,
            riichiSticks: room.round.riichiSticks + 1,
          };

          await updateState({
            players: newPlayers,
            round: newRound,
            history: newHistory as RoomState[],
            lastEvent: createRiichiLastEvent(generateId(12), playerId),
          });
        }}
        onCenterClick={handleCenterClick}
        useChip={room.settings.useChip}
        yakitoriPlayerIds={yakitoriPlayerIds}
      />

      {/* Undo Button */}
      {room.history && room.history.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleUndo}
            variant="secondary"
            style={{ padding: '8px 16px', fontSize: '16px' }}
          >
            Undo ({room.history.length})
          </Button>
        </div>
      )}

      {/* Scoring Modal */}
      <ScoringModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        players={room.players}
        dealerId={currentDealer?.id || room.players[0]?.id || ''}
        currentUserId={myPlayerId}
        initialWinnerId={selectedWinnerId || room.players[0]?.id}
        initialLoserId={selectedLoserId || undefined}
        initialWinType={initialWinType}
        settings={room.settings}
        onConfirm={handleScoreConfirm}
        onRyukyoku={handleRyukyoku}
      />

      {/* Join Modal */}
      <Modal isOpen={isJoinModalOpen} onClose={() => {}} title="Join Room">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>Your Name</label>
          <Input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            style={{ fontSize: '16px' }}
          />
          <Button onClick={handleJoinSubmit} disabled={!joinName}>
            Join Game
          </Button>
        </div>
      </Modal>

      {/* Menu Modal */}
      <Modal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="メニュー">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SoundEffectToggle checked={isSoundEnabled} onChange={setIsSoundEnabled} />
          <Button
            onClick={() => {
              setIsMenuOpen(false);
              setIsHistoryOpen(true);
            }}
            size="large"
          >
            戦績 (History)
          </Button>
          {room.status === 'playing' && (
            <Button
              onClick={() => {
                setIsMenuOpen(false);
                setIsAdjustmentOpen(true);
              }}
              size="large"
            >
              点数調整
            </Button>
          )}
          {room.status === 'playing' && (
            <Button
              variant="danger"
              onClick={() => {
                setIsMenuOpen(false);
                setIsAbortConfirmOpen(true);
              }}
            >
              途中終了
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/')}>
            トップへ戻る
          </Button>
          <Button variant="secondary" onClick={() => setIsMenuOpen(false)}>
            閉じる
          </Button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="戦績履歴">
        <SessionHistoryTable room={room} />
        <div style={{ marginTop: '24px', display: 'grid', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>詳細分析対象イベント</h3>
          <AnalysisEventList
            events={analysisEvents}
            savedHandLogIds={savedHandLogIds}
            emptyMessage="分析対象のイベントはまだありません。"
            onSelect={(event) => {
              setAnalysisSelection({
                handLog: event.handLog,
                source: event.source,
                players: event.players,
              });
            }}
          />
        </div>
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button onClick={() => setIsHistoryOpen(false)}>閉じる</Button>
        </div>
      </Modal>

      {/* Match Finished Modal */}
      <MatchFinishedModal
        isOpen={showFinishedModal}
        onConfirm={() => {
          setShowFinishedModal(false);
          setIsTransitioning(false); // Triggers re-render which sees finished status and !isTransitioning -> show ResultView
        }}
      />

      <ConfirmationDialog
        isOpen={isEndMatchConfirmOpen}
        onConfirm={handleEndMatchConfirm}
        onCancel={() => setIsEndMatchConfirmOpen(false)}
        title="対局終了の確認"
        message={'この対局を終了しますか？\n終了後は閲覧のみ可能になります。'}
        type="danger"
        confirmText="終了する"
      />

      <SettlementModal
        isOpen={isSettlementOpen}
        onClose={handleSettlementClose}
        players={room.players}
        gameResults={room.gameResults || []}
        rate={room.settings.rate || 0}
      />

      <AnalysisEventModalLauncher
        isOpen={analysisSelection !== null}
        selection={analysisSelection}
        onClose={() => setAnalysisSelection(null)}
      />

      {/* Adjustment Modal */}
      <AdjustmentModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        players={room.players}
        onConfirm={handleAdjustment}
      />

      {/* Abort Game Modal */}
      <Modal
        isOpen={isAbortConfirmOpen}
        onClose={() => setIsAbortConfirmOpen(false)}
        title="途中終了の確認"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>対局を途中終了しますか？</p>
          <p
            style={{
              margin: 0,
              lineHeight: 1.5,
              fontSize: '14px',
              color: 'var(--color-text-secondary, #666)',
            }}
          >
            供託は1位総取りとなります。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button variant="primary" onClick={() => handleAbortGame(true)}>
              成績に反映して終了
            </Button>
            <Button variant="danger" onClick={() => handleAbortGame(false)}>
              成績に反映せず終了
            </Button>
            <Button variant="secondary" onClick={() => setIsAbortConfirmOpen(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      </Modal>

      {/* Extension Overlay */}
      {extensionOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.5s ease-out',
          }}
        >
          <h1
            style={{
              color: '#fff',
              fontSize: '3rem',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              textAlign: 'center',
            }}
          >
            {extensionOverlay}
          </h1>
        </div>
      )}
    </div>
  );
};

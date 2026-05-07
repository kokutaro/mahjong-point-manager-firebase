import { useEffect, useRef, useState } from 'react';
import type { LastEvent, Player, RoomState } from '../../types';
import { getCurrentPlayerRanks } from '../../utils/resultCalculator';
import { Button } from '../ui/Button';
import { ScoreDisplay } from '../ui/ScoreDisplay';
import styles from './ScoreBoard.module.css';

const createDisplayScoreMap = (players: Player[]): Record<string, number> => {
  return players.reduce<Record<string, number>>((scoreMap, player) => {
    return {
      ...scoreMap,
      [player.id]: player.score,
    };
  }, {});
};

export interface ScoreBoardProps {
  players: Player[];
  round: RoomState['round'];
  lastEvent?: LastEvent;
  onPlayerClick?: (playerId: string) => void;
  onRiichi?: (playerId: string) => void;
  onCenterClick?: () => void;
  useChip?: boolean;
  currentUserId?: string;
  yakitoriPlayerIds?: Set<string>;
}

export const ScoreBoard = ({
  players,
  round,
  lastEvent,
  onPlayerClick,
  onRiichi,
  onCenterClick,
  useChip = false,
  currentUserId,
  yakitoriPlayerIds,
}: ScoreBoardProps) => {
  const [displayScores, setDisplayScores] = useState<Record<string, number>>(() =>
    createDisplayScoreMap(players),
  );

  const handleDisplayScoreChange = (playerId: string, score: number) => {
    setDisplayScores((currentScores) => {
      if (currentScores[playerId] === score) {
        return currentScores;
      }

      return {
        ...currentScores,
        [playerId]: score,
      };
    });
  };

  const playerRanks = getCurrentPlayerRanks(
    players.map((player) => ({
      ...player,
      score: displayScores[player.id] ?? player.score,
    })),
  );

  // Determine rotation
  // We want currentUserId at "Bottom".
  // Players array is assumed to be in seating order (CCW: East -> South -> West -> North)
  // Display order: Bottom -> Right -> Top -> Left

  let orderedPlayers = [...players];
  if (currentUserId) {
    const myIndex = players.findIndex((p) => p.id === currentUserId);
    if (myIndex !== -1) {
      orderedPlayers = [...players.slice(myIndex), ...players.slice(0, myIndex)];
    }
  }

  // Helper to assign grid areas
  const getPositionClass = (player: Player, total: number) => {
    // Always find index relative to original "players" array (Seating Order)
    const originalIndex = players.findIndex((p) => p.id === player.id);
    const myIndex = currentUserId ? players.findIndex((p) => p.id === currentUserId) : 0;

    // If user not found (observer?), default to 0 (Bottom)
    const safeMyIndex = myIndex === -1 ? 0 : myIndex;

    if (total === 4) {
      // Standard 4-player rotation
      // Relative index: 0=Bottom, 1=Right, 2=Top, 3=Left
      const relIndex = (originalIndex - safeMyIndex + 4) % 4;
      if (relIndex === 0) return styles.areaBottom;
      if (relIndex === 1) return styles.areaRight;
      if (relIndex === 2) return styles.areaTop;
      if (relIndex === 3) return styles.areaLeft;
    } else if (total === 3) {
      // 3-player logic (North-missing variant)
      // Virtual Seats: 0 (East), 1 (South), 2 (West). Missing 3 (North).
      const toVirtual = (i: number) => i;

      const virtualMe = toVirtual(safeMyIndex);
      const virtualTarget = toVirtual(originalIndex);

      const relVirtual = (virtualTarget - virtualMe + 4) % 4;

      if (relVirtual === 0) return styles.areaBottom;
      if (relVirtual === 1) return styles.areaRight;
      if (relVirtual === 2) return styles.areaTop;
      if (relVirtual === 3) return styles.areaLeft;
    }
    return '';
  };

  // Find "East" player for Dealer styling
  const getIsDealer = (player: Player) => player.wind === 'East';

  return (
    <div className={styles.container}>
      <div className={styles.tableLayout}>
        {/* Center Panel */}
        <div className={`${styles.centerPanel} ${styles.areaCenter}`} onClick={onCenterClick}>
          <div className={styles.roundInfo}>
            {round.wind === 'East'
              ? '東'
              : round.wind === 'South'
                ? '南'
                : round.wind === 'West'
                  ? '西'
                  : '北'}{' '}
            {round.number} 局
          </div>
          <div className={styles.counters}>
            <div className={styles.counterItem}>
              <span className={styles.label}>本場</span>
              <span className={styles.value}>{round.honba}</span>
            </div>
            <div className={styles.counterItem}>
              <span className={styles.label}>供託</span>
              <span className={styles.value}>{round.riichiSticks}</span>
            </div>
          </div>
        </div>

        {/* Players */}
        {orderedPlayers.map((player) => (
          <div key={player.id} className={getPositionClass(player, orderedPlayers.length)}>
            <PlayerRow
              player={player}
              lastEvent={lastEvent}
              onClick={() => onPlayerClick?.(player.id)}
              onRiichi={() => onRiichi?.(player.id)}
              useChip={useChip}
              isDealer={getIsDealer(player)}
              onDisplayScoreChange={handleDisplayScoreChange}
              rank={playerRanks[player.id]}
              isYakitori={yakitoriPlayerIds?.has(player.id) ?? false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const PlayerRow = ({
  player,
  lastEvent,
  onClick,
  onRiichi,
  useChip,
  isDealer,
  onDisplayScoreChange,
  rank,
  isYakitori,
}: {
  player: Player;
  lastEvent?: LastEvent;
  onClick: () => void;
  onRiichi: () => void;
  useChip: boolean;
  isDealer?: boolean;
  onDisplayScoreChange: (playerId: string, score: number) => void;
  rank?: number;
  isYakitori?: boolean;
}) => {
  const [displayScore, setDisplayScore] = useState(player.score);
  const [delta, setDelta] = useState<{ value: number; type: 'hand' | 'stick' | 'simple' } | null>(
    null,
  );
  const [isAnimating, setIsAnimating] = useState(false);

  // Track event ID to avoid re-triggering same animation
  const prevEventIdRef = useRef<string | undefined>(lastEvent?.id);
  // Track score solely for fallback (e.g. undo or direct edit without event)
  const prevScoreRef = useRef(player.score);
  const onDisplayScoreChangeRef = useRef(onDisplayScoreChange);

  useEffect(() => {
    onDisplayScoreChangeRef.current = onDisplayScoreChange;
  }, [onDisplayScoreChange]);

  useEffect(() => {
    onDisplayScoreChangeRef.current(player.id, displayScore);
  }, [displayScore, player.id]);

  useEffect(() => {
    // Check if LastEvent triggers an animation
    if (lastEvent && lastEvent.id !== prevEventIdRef.current) {
      const myDelta = lastEvent.deltas[player.id];
      if (myDelta) {
        // Trigger 2-stage animation
        const totalDelta = myDelta.hand + myDelta.sticks;

        // Sanity Check for invalid/astronomical deltas
        // Prevents animation bugs where startScore becomes huge (e.g. -5e31)
        if (!Number.isFinite(totalDelta) || Math.abs(totalDelta) > 500000) {
          console.warn('ScoreBoard: Detected astronomical delta, skipping animation.', totalDelta);
          prevEventIdRef.current = lastEvent.id;
          prevScoreRef.current = player.score;
          requestAnimationFrame(() => {
            setDisplayScore(player.score);
          });
          return;
        }

        const startScore = player.score - totalDelta; // Reconstruct start

        // Setup
        prevEventIdRef.current = lastEvent.id;
        prevScoreRef.current = player.score;

        const HAND_DURATION = 800;
        const PAUSE = 400;
        const STICK_DURATION = 800;
        const FADE_OUT_DELAY = 1500; // Duration to keep the final delta visible
        const frameIds: number[] = [];

        // Initial State (Phase 1)
        // If hand is 0, we might want to skip or just show 0?
        // Usually hand != 0. If 0 (e.g. only riichi stick?), jump to sticks?
        // Let's assume sequential.
        frameIds.push(
          requestAnimationFrame(() => {
            setIsAnimating(true);
            setDisplayScore(startScore);
            if (myDelta.hand !== 0) setDelta({ value: myDelta.hand, type: 'hand' });
            else if (myDelta.sticks !== 0) setDelta({ value: myDelta.sticks, type: 'stick' });

            // Animation Loop
            const startTime = performance.now();

            const animate = (now: number) => {
              const elapsed = now - startTime;

              if (elapsed < HAND_DURATION) {
                const progress = elapsed / HAND_DURATION;
                const ease = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(startScore + myDelta.hand * ease);
                setDisplayScore(current);
                frameIds.push(requestAnimationFrame(animate));
              } else if (elapsed < HAND_DURATION + PAUSE) {
                setDisplayScore(startScore + myDelta.hand);
                frameIds.push(requestAnimationFrame(animate));
              } else if (elapsed < HAND_DURATION + PAUSE + STICK_DURATION) {
                const stickElapsed = elapsed - (HAND_DURATION + PAUSE);
                const progress = stickElapsed / STICK_DURATION;
                const ease = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(startScore + myDelta.hand + myDelta.sticks * ease);
                setDisplayScore(current);
                frameIds.push(requestAnimationFrame(animate));
              } else {
                setDisplayScore(player.score);
                setIsAnimating(false);
              }
            };

            frameIds.push(requestAnimationFrame(animate));
          }),
        );

        // Delta Switching Logic (Timed)
        const timers: ReturnType<typeof setTimeout>[] = [];

        // Switch to Sticks delta at start of Phase 2 (if sticks exist and we started with hand)
        if (myDelta.sticks !== 0 && myDelta.hand !== 0) {
          const switchDelay = HAND_DURATION + PAUSE / 2; // Switch halfway through pause
          timers.push(
            setTimeout(() => {
              setDelta({ value: myDelta.sticks, type: 'stick' });
            }, switchDelay),
          );
        }

        // Cleanup Final Delta
        const totalDuration = HAND_DURATION + PAUSE + STICK_DURATION + FADE_OUT_DELAY;
        timers.push(
          setTimeout(() => {
            setDelta(null);
          }, totalDuration),
        );

        return () => {
          timers.forEach(clearTimeout);
          frameIds.forEach((frameId) => cancelAnimationFrame(frameId));
        };
      } else {
        // Event exists but didn't affect me? (possible if delta 0)
        // Just snap.
        prevEventIdRef.current = lastEvent.id;
        prevScoreRef.current = player.score;
        requestAnimationFrame(() => {
          setDisplayScore(player.score);
        });
      }
    } else if (prevScoreRef.current !== player.score) {
      // Fallback: Score changed without a LastEvent (e.g. Undo, Riichi click, or initial load sync)
      // Riichi click is technically a local action?
      // Wait, handleRiichi updates state but doesn't create a "LastEvent" in my stored logic.
      // So Riichi will trigger this block.
      // Riichi specific animation? (Just -1000 fast).
      // Or I should make Riichi create a LastEvent too?
      // For now, keep fallback logic (simple 1-step logic or just snap if we only care about 2-step for wins).

      // Fallback animation (Single stage) for non-win updates
      const diff = player.score - prevScoreRef.current;
      if (diff !== 0) {
        const duration = 1000;
        const start = prevScoreRef.current;
        const frameIds: number[] = [];

        frameIds.push(
          requestAnimationFrame(() => {
            setDelta({ value: diff, type: 'simple' });
            const startTime = performance.now();

            const animateSimple = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 3);
              const current = Math.floor(start + diff * ease);
              setDisplayScore(current);
              if (progress < 1) frameIds.push(requestAnimationFrame(animateSimple));
              else {
                setDelta(null);
                setDisplayScore(player.score);
                prevScoreRef.current = player.score;
              }
            };

            frameIds.push(requestAnimationFrame(animateSimple));
          }),
        );

        return () => {
          frameIds.forEach((frameId) => cancelAnimationFrame(frameId));
        };
      }
    } else {
      // Init or stable
      if (!isAnimating) {
        requestAnimationFrame(() => {
          setDisplayScore(player.score);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.score, lastEvent?.id]);

  const canRiichi = player.score >= 1000 && !player.isRiichi;

  return (
    <div
      className={`${styles.playerCard} ${isDealer ? styles.dealer : ''} ${player.isRiichi ? styles.riichi : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onClick();
      }}
    >
      {/* Header: Wind + Name */}
      <div className={styles.cardHeader}>
        <div className={styles.windBadge}>
          {player.wind === 'East'
            ? '東'
            : player.wind === 'South'
              ? '南'
              : player.wind === 'West'
                ? '西'
                : '北'}
        </div>
        <div className={styles.playerName}>{player.name}</div>
        {isYakitori && <div className={styles.yakitoriBadge}>🐔</div>}
      </div>

      {/* Body: Score + Deltas */}
      <div className={styles.cardBody}>
        {delta !== null && (
          <div
            key={`${delta.type}-${delta.value}`}
            className={`${styles.delta} ${delta.value > 0 ? styles.deltaPositive : styles.deltaNegative}`}
          >
            {delta.value > 0 ? '+' : delta.value < 0 ? '-' : ''}
            {Math.abs(delta.value).toLocaleString()}
          </div>
        )}
        <ScoreDisplay
          score={displayScore}
          size="large" // CSS overrides this to 2rem
          className={styles.playerScore}
        />
        {rank !== undefined && <div className={styles.playerRank}>{rank}位</div>}
      </div>

      {/* Footer: Chips + Riichi */}
      <div className={styles.cardFooter}>
        {useChip ? (
          <div className={styles.chipCount}>
            <span style={{ marginRight: '4px' }}>🪙</span> x {player.chip ?? 0}
          </div>
        ) : (
          <div />
        )}{' '}
        {/* Spacer if no chips */}
        <div className={styles.riichiContainer}>
          <Button
            size="small"
            variant="danger"
            className={styles.riichiBtn}
            disabled={!canRiichi || player.isRiichi}
            onClick={(e) => {
              e.stopPropagation();
              if (canRiichi) onRiichi();
            }}
          >
            リーチ
          </Button>
        </div>
      </div>
    </div>
  );
};

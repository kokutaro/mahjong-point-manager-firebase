import { useEffect, useRef, useState } from 'react';
import type { LastEvent, Player, RoomState } from '../../types';
import { ScoreDisplay } from '../ui/ScoreDisplay';
import styles from './ScoreBoard.module.css';

export interface ScoreBoardProps {
  players: Player[];
  round: RoomState['round'];
  lastEvent?: LastEvent;
  onPlayerClick?: (playerId: string) => void;
  onRiichi?: (playerId: string) => void;
  onCenterClick?: () => void;
  useChip?: boolean;
  currentUserId?: string;
}

export const ScoreBoard = ({ players, round, lastEvent, onPlayerClick, onRiichi, onCenterClick, useChip = false, currentUserId }: ScoreBoardProps) => {
  // Determine rotation
  // We want currentUserId at "Bottom".
  // Players array is assumed to be in seating order (CCW: East -> South -> West -> North)
  // Display order: Bottom -> Right -> Top -> Left
  
  let orderedPlayers = [...players];
  if (currentUserId) {
      const myIndex = players.findIndex(p => p.id === currentUserId);
      if (myIndex !== -1) {
          orderedPlayers = [
              ...players.slice(myIndex),
              ...players.slice(0, myIndex)
          ];
      }
  }

  // Helper to assign grid areas
  const getPositionClass = (index: number, total: number) => {
      // Index 0 is always Bottom (Self)
      if (index === 0) return styles.areaBottom;
      
      if (total === 4) {
          if (index === 1) return styles.areaRight;
          if (index === 2) return styles.areaTop;
          if (index === 3) return styles.areaLeft;
      } else if (total === 3) {
          if (index === 1) return styles.areaRight;
          if (index === 2) return styles.areaLeft; // 3ma: Bottom, Right, Left
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
            {round.wind === 'East' ? '東' : round.wind === 'South' ? '南' : round.wind === 'West' ? '西' : '北'} {round.number} 局
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
        {orderedPlayers.map((player, index) => (
            <div key={player.id} className={getPositionClass(index, orderedPlayers.length)}>
                <PlayerRow
                    player={player}
                    lastEvent={lastEvent}
                    onClick={() => onPlayerClick?.(player.id)}
                    onRiichi={() => onRiichi?.(player.id)}
                    useChip={useChip}
                    isDealer={getIsDealer(player)}
                    // displayMode removed as it is handled via CSS Grid areas now
                />
            </div>
        ))}
      </div>
    </div>
  );
};

const PlayerRow = ({ player, lastEvent, onClick, onRiichi, useChip, isDealer }: { player: Player, lastEvent?: LastEvent, onClick: () => void, onRiichi: () => void, useChip: boolean, isDealer?: boolean }) => {
  const [displayScore, setDisplayScore] = useState(player.score);
  const [delta, setDelta] = useState<{ value: number, type: 'hand' | 'stick' | 'simple' } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Track event ID to avoid re-triggering same animation
  const prevEventIdRef = useRef<string | undefined>(lastEvent?.id);
  // Track score solely for fallback (e.g. undo or direct edit without event)
  const prevScoreRef = useRef(player.score);

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
             setDisplayScore(player.score);
             prevEventIdRef.current = lastEvent.id;
             prevScoreRef.current = player.score;
             return;
         }

         const startScore = player.score - totalDelta; // Reconstruct start
         
         // Setup
         setIsAnimating(true);
         prevEventIdRef.current = lastEvent.id;
         prevScoreRef.current = player.score;

         const HAND_DURATION = 800;
         const PAUSE = 400;
         const STICK_DURATION = 800;
         const FADE_OUT_DELAY = 1500; // Duration to keep the final delta visible

         // Initial State (Phase 1)
         // If hand is 0, we might want to skip or just show 0? 
         // Usually hand != 0. If 0 (e.g. only riichi stick?), jump to sticks?
         // Let's assume sequential.
         setDisplayScore(startScore);
         if (myDelta.hand !== 0) setDelta({ value: myDelta.hand, type: 'hand' });
         else if (myDelta.sticks !== 0) setDelta({ value: myDelta.sticks, type: 'stick' });
         
         // Animation Loop
         const startTime = performance.now();
         
         const animate = (now: number) => {
             const elapsed = now - startTime;
             
             if (elapsed < HAND_DURATION) {
                 // Phase 1: Hand
                 const progress = elapsed / HAND_DURATION;
                 const ease = 1 - Math.pow(1 - progress, 3);
                 const current = Math.floor(startScore + (myDelta.hand * ease));
                 setDisplayScore(current);
                 requestAnimationFrame(animate);
             } else if (elapsed < HAND_DURATION + PAUSE) {
                 // Pause
                 setDisplayScore(startScore + myDelta.hand);
                 requestAnimationFrame(animate);
             } else if (elapsed < HAND_DURATION + PAUSE + STICK_DURATION) {
                 // Phase 2: Sticks
                 const stickElapsed = elapsed - (HAND_DURATION + PAUSE);
                 const progress = stickElapsed / STICK_DURATION;
                 const ease = 1 - Math.pow(1 - progress, 3);
                 const current = Math.floor((startScore + myDelta.hand) + (myDelta.sticks * ease));
                 setDisplayScore(current);
                 requestAnimationFrame(animate); 
             } else {
                 // End
                 setDisplayScore(player.score);
                 setIsAnimating(false);
             }
         };
         
         requestAnimationFrame(animate);
         
         // Delta Switching Logic (Timed)
         const timers: ReturnType<typeof setTimeout>[] = [];
         
         // Switch to Sticks delta at start of Phase 2 (if sticks exist and we started with hand)
         if (myDelta.sticks !== 0 && myDelta.hand !== 0) {
             const switchDelay = HAND_DURATION + (PAUSE / 2); // Switch halfway through pause
             timers.push(setTimeout(() => {
                 setDelta({ value: myDelta.sticks, type: 'stick' });
             }, switchDelay));
         }

         // Cleanup Final Delta
         const totalDuration = HAND_DURATION + PAUSE + STICK_DURATION + FADE_OUT_DELAY;
         timers.push(setTimeout(() => {
             setDelta(null);
         }, totalDuration));
         
         return () => timers.forEach(clearTimeout);
      } else {
          // Event exists but didn't affect me? (possible if delta 0)
          // Just snap.
          setDisplayScore(player.score);
          prevEventIdRef.current = lastEvent.id;
          prevScoreRef.current = player.score;
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
           setDelta({ value: diff, type: 'simple' });
           const duration = 1000;
           const start = prevScoreRef.current;
           const startTime = performance.now();
           
           const animateSimple = (now: number) => {
               const elapsed = now - startTime;
               const progress = Math.min(elapsed / duration, 1);
               const ease = 1 - Math.pow(1 - progress, 3);
               const current = Math.floor(start + diff * ease);
               setDisplayScore(current);
               if (progress < 1) requestAnimationFrame(animateSimple);
               else {
                   setDelta(null);
                   setDisplayScore(player.score);
                   prevScoreRef.current = player.score;
               }
           };
           requestAnimationFrame(animateSimple);
       }
    } else {
        // Init or stable
        if (!isAnimating) setDisplayScore(player.score);
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
            {player.wind === 'East' ? '東' : player.wind === 'South' ? '南' : player.wind === 'West' ? '西' : '北'}
        </div>
        <div className={styles.playerName}>{player.name}</div>
      </div>

      {/* Body: Score + Deltas */}
      <div className={styles.cardBody}>
         {delta !== null && (
             <div 
                key={`${delta.type}-${delta.value}`} 
                className={`${styles.delta} ${delta.value > 0 ? styles.deltaPositive : styles.deltaNegative}`}
             >
                {delta.value > 0 ? '+' : ''}{delta.value}
             </div>
         )}
         <ScoreDisplay
            score={displayScore}
            size="large" // CSS overrides this to 2rem
            className={styles.playerScore}
         />
      </div>

      {/* Footer: Chips + Riichi */}
      <div className={styles.cardFooter}>
           {useChip ? (
             <div className={styles.chipCount}>
                 <span style={{ marginRight: '4px' }}>🪙</span> x {player.chip ?? 0}
             </div>
           ) : <div />} {/* Spacer if no chips */}
           
           <div className={styles.riichiContainer}>
               <button 
                 className={styles.riichiBtn}
                 disabled={!canRiichi || player.isRiichi}
                 onClick={(e) => {
                     e.stopPropagation();
                     if (canRiichi) onRiichi();
                 }}
               >
                 リーチ
               </button>
           </div>
      </div>
    </div>
  );
};

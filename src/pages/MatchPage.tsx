import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MatchFinishedModal } from '../components/features/MatchFinishedModal';
import { ResultView } from '../components/features/ResultView';
import { ScoreBoard } from '../components/features/ScoreBoard';
import { ScoringModal } from '../components/features/ScoringModal';
import { SessionHistoryTable } from '../components/features/SessionHistoryTable';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useRoom } from '../hooks/useRoom';
import type { Player, RoomState } from '../types';
import { processHandEnd } from '../utils/gameLogic';
import { generateId } from '../utils/id';
import { calculateFinalScores } from '../utils/resultCalculator';
import { calculateRyukyokuScore, type ScorePayment } from '../utils/scoreCalculator';
import { calculateTransaction } from '../utils/scoreDiff';

export const MatchPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, loading, join, updateState } = useRoom(roomId || '');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  
  // Local user ID (Simple implementation)
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [joinName, setJoinName] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  
  // Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Game End Transition States
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const prevStatusRef = useRef<RoomState['status'] | undefined>(undefined);

  useEffect(() => {
    if (room) {
        const current = room.status;
        const prev = prevStatusRef.current;

        // Init ref on first valid load if undefined
        if (prev === undefined) {
             prevStatusRef.current = current;
             return;
        }

        // Detect change to finished
        if (current === 'finished' && prev && prev !== 'finished') {
             // If not already transitioning (self-triggered), trigger it now
             if (!isTransitioning) {
                 // Trigger logic inline to avoid dependency issues or use function ref
                 setIsTransitioning(true);
                 setTimeout(() => {
                    setShowFinishedModal(true);
                 }, 3000);
             }
        }
        
        prevStatusRef.current = current;
    }
  }, [room?.status, isTransitioning]);


  useEffect(() => {
    // Load or init local player ID
    let pid = localStorage.getItem('mahjong_player_id');
    let pname = localStorage.getItem('mahjong_player_name');
    if (!pid) {
      pid = generateId(8);
      localStorage.setItem('mahjong_player_id', pid);
    }
    setMyPlayerId(pid);
    if (pname) setJoinName(pname);
  }, []);

  // Check if I need to join
  useEffect(() => {
    if (room && !loading) {
      const isJoined = room.players.some(p => p.id === myPlayerId);
      if (!isJoined && room.players.length < (room.settings.mode === '4ma' ? 4 : 3)) {
        setIsJoinModalOpen(true);
      }
    }
  }, [room, loading, myPlayerId]);

  const handleJoinSubmit = async () => {
    if (!joinName.trim()) return;
    localStorage.setItem('mahjong_player_name', joinName);
    
    // Determine info
    const winds: ('East'|'South'|'West'|'North')[] = ['East', 'South', 'West', 'North'];
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
        chip: 0
      });
      setIsJoinModalOpen(false);
    } catch (e) {
      alert('Join failed');
    }
  };

  const [selectedLoserId, setSelectedLoserId] = useState<string | null>(null);
  const [initialWinType, setInitialWinType] = useState<'Ron' | 'Tsumo' | 'Ryukyoku'>('Ron');

  const handlePlayerClick = (id: string) => {
    if (!room) return;
    
    if (id === myPlayerId) {
      // Tsumo (Self Click)
      setSelectedWinnerId(id);
      setSelectedLoserId(null);
      setInitialWinType('Tsumo');
    } else {
      // Ron (Target is Loser, I am Winner)
      // Note: If I am not in the game, default to simple selection?
      // Assuming spectator checks score: just open modal with that player as winner?
      // Spec says: "Ron case: I tap loser's score -> Winner is Me, Loser is Tapped Player"
      // So we assume "Me" is the winner.
      setSelectedWinnerId(myPlayerId);
      setSelectedLoserId(id);
      setInitialWinType('Ron');
    }
    setIsModalOpen(true);
  };
  
  const handleCenterClick = () => {
    if (!room) return;
    setInitialWinType('Ryukyoku');
    setIsModalOpen(true);
  };

  const handleUndo = async () => {
    if (!room || !room.history || room.history.length === 0) return;
    // Pop last state
    const lastState = room.history[room.history.length - 1];
    
    // We want to revert to last state
    // AND remove the last entry from history.
    // Since we can't easily "pop" from Firestore array without reading whole array,
    // we just replace the history array with sliced one.
    
    const newHistory = room.history.slice(0, -1);
    
    await updateState({
      ...lastState,
      history: newHistory
    });
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
  const handleScoreConfirm = async (results: { payment: ScorePayment, winnerId: string, loserId: string | null, chips: number }[]) => {
    if (!room) return;

    // Snapshot current state for History
    // Caution: removing history from snapshot to avoid deep nesting recursion
    const { history: _h, ...currentStateSnapshot } = room;
    // Append to history
    // We should limit history size ideally
    const newHistory = [...(room.history || []), currentStateSnapshot];

    const players = room.players;
    const round = room.round;

    const playerIds = players.map(p => p.id);
    const dealer = players.find(p => p.wind === 'East');
    const dealerId = dealer ? dealer.id : players[0].id;

    // Calculate Diffs
    // Calculate Diffs
    const finalDeltas = new Map<string, { total: number, hand: number, sticks: number, chips: number }>();
    playerIds.forEach(id => finalDeltas.set(id, { total: 0, hand: 0, sticks: 0, chips: 0 }));

    let remainingRiichi = round.riichiSticks;
    let remainingHonba = round.honba;

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
            sticksToTake
        );

        // Chip Calculation
        const isTsumo = !res.loserId;
        const chipCount = res.chips;
        const chipDeltas = new Map<string, number>();
        playerIds.forEach(id => chipDeltas.set(id, 0));

        if (chipCount !== 0) {
             if (isTsumo) {
                 // Tsumo: All others pay to Winner
                 // Winner gets: chipCount * (players - 1)
                 // Others lose: chipCount
                 const loserIds = playerIds.filter(id => id !== res.winnerId);
                 chipDeltas.set(res.winnerId, chipCount * loserIds.length);
                 loserIds.forEach(id => chipDeltas.set(id, -chipCount));
             } else {
                 // Ron: Loser pays Winner
                 if (res.loserId) {
                     chipDeltas.set(res.winnerId, chipCount);
                     chipDeltas.set(res.loserId, -chipCount);
                 }
             }
        }

        tx.deltas.forEach(d => {
            const current = finalDeltas.get(d.playerId)!;
            const chipChange = chipDeltas.get(d.playerId) || 0;
            finalDeltas.set(d.playerId, {
                total: current.total + d.total,
                hand: current.hand + d.hand,
                sticks: current.sticks + d.sticks,
                chips: current.chips + chipChange
            });
        });
    });

    const newPlayers = players.map(p => {
        const d = finalDeltas.get(p.id)!;
        return { ...p, score: p.score + d.total, chip: p.chip + d.chips, isRiichi: false }; 
    });

    // Create LastEvent
    const lastEventDeltas: Record<string, { hand: number, sticks: number, chips?: number }> = {};
    finalDeltas.forEach((val, key) => {
        if (val.total !== 0 || val.chips !== 0) {
            lastEventDeltas[key] = { hand: val.hand, sticks: val.sticks, chips: val.chips };
        }
    });

    const lastEvent = {
        id: generateId(12),
        type: 'score_change' as const,
        deltas: lastEventDeltas
    };
    
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
        winners: results.map(r => ({ ...r, id: r.winnerId })),
        loserId: results[0].loserId // Common loser for all (simplified for multi-ron)
    };

    const nextState = processHandEnd({ players: newPlayers, round, id: room.id, status: room.status, settings: room.settings }, handResult);

    const nextStatus = nextState.isGameOver ? 'finished' : room.status;

    // If game over, calculate result
    let nextGameResults = room.gameResults || [];
    if (nextState.isGameOver) {
        // Use newPlayers (scores updated) for calculation
        // Note: nextState.nextRound might not be relevant for score calc
        const result = calculateFinalScores(newPlayers, room.settings, generateId(12));
        nextGameResults = [...nextGameResults, result];
    }
    
    // Wind Rotation Block
    // Logic: If NOT Renchan, Rotate.
    let nextPlayersWithWind = newPlayers;
    
    // Check if dealer changed (Renchan logic is internal to processHandEnd, but we can see if round count/wind changed)
    const isRenchan = (nextState.nextRound.wind === round.wind && nextState.nextRound.number === round.number);
    
    if (!isRenchan) {
        // Rotate Winds
        const windOrder: Player['wind'][] = ['East', 'South', 'West', 'North'];
        // Find current East
        const currentEastIdx = newPlayers.findIndex(p => p.wind === 'East');
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
      round: { ...nextState.nextRound, riichiSticks: remainingRiichi },
      status: nextStatus as RoomState['status'],
      history: newHistory as RoomState[],
      lastEvent: lastEvent,
      gameResults: nextGameResults
    });
    
    setIsModalOpen(false);
  };

  const handleRyukyoku = async (tenpaiIds: string[]) => {
    if (!room) return;
    
    // 1. History Snapshot
    const { history: _h, ...currentStateSnapshot } = room;
    const newHistory = [...(room.history || []), currentStateSnapshot];

    // 2. Score Calculation
    const mode = room.settings.mode || '4ma';
    const notenIds = room.players.filter(p => !tenpaiIds.includes(p.id)).map(p => p.id);
    
    const { tenpai, noten } = calculateRyukyokuScore(tenpaiIds.length, notenIds.length, mode);
    
    // 3. Update Players & LastEvent
    const lastEventDeltas: Record<string, { hand: number, sticks: number }> = {};
    
    const newPlayers = room.players.map(p => {
        let delta = 0;
        if (tenpaiIds.includes(p.id)) delta = tenpai;
        else delta = noten;
        
        if (delta !== 0) {
            lastEventDeltas[p.id] = { hand: delta, sticks: 0 };
        }
        
        return { ...p, score: p.score + delta, isRiichi: false }; // Reset riichi flag
    });
    
    const lastEvent = {
        id: generateId(12),
        type: 'score_change' as const,
        deltas: lastEventDeltas
    };

    // 4. Logic for Next Round (Dealer Rotation, Honba, Stick Carryover)
    // Note: Sticks are carried over on Draw. Logic says `processHandEnd` handles logic state, 
    // but actual sticking display needs to persist. `nextState.nextRound.riichiSticks` should reuse current.
    // Let's check logic: processHandEnd returns nextRound. 
    // Logic currently says `nextRound = { ...round }`. Riichi sticks are copied.
    // So we just rely on logic's return for next round state, except ensuring we pass current sticks correctly.
    
    const handResult = {
        type: 'Draw' as const,
        tenpaiPlayerIds: tenpaiIds
    };
    
    const nextState = processHandEnd({ 
        players: newPlayers, // Logic checks for Dealer Tenpai etc via ID.
        round: room.round, 
        id: room.id, 
        status: room.status, 
        settings: room.settings 
    }, handResult);
    
    const nextStatus = nextState.isGameOver ? 'finished' : room.status;
    
    let nextGameResults = room.gameResults || [];
    if (nextState.isGameOver) {
        const result = calculateFinalScores(newPlayers, room.settings, generateId(12));
        nextGameResults = [...nextGameResults, result];
    }

    // 5. Player Wind Rotation (Copied from Score Confirm logic)
    // Common Rotation Logic should be refactored potentially but inline is fine.
    let nextPlayersWithWind = newPlayers;
    const isRenchan = (nextState.nextRound.wind === room.round.wind && nextState.nextRound.number === room.round.number);
    
    if (!isRenchan) {
        const windOrder: Player['wind'][] = ['East', 'South', 'West', 'North'];
        const currentEastIdx = newPlayers.findIndex(p => p.wind === 'East');
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
        round: nextState.nextRound, // Includes updated Honba, same/carried sticks
        status: nextStatus as RoomState['status'],
        history: newHistory as RoomState[],
        lastEvent: lastEvent,
        gameResults: nextGameResults
    });

    setIsModalOpen(false);
  };

  const handleNextGame = async () => {
    if (!room) return;
    
    // 1. Rotate Initial Dealer (Seat Rotation)
    // The "Gap" in my implementation: we don't have "Seat Index" in Player explicitly, we rely on Array Order?
    // Usually "Next Game" means:
    // - Rotate the "East" Marker to the next person (who was South).
    // - Reset Points.
    
    // In current implementation, `wind` on Player determines who is East.
    // We just need to rotate the winds of the *players*.
    // BUT, `room.players` have already been wind-rotated during the game?
    // Actually, `room.players` array order usually implies "Seat". Wind property is "Current Wind".
    // If we want to rotate "起家 (Initial East)", we should just shift the winds relative to seats once more?
    // Wait, usually "Game End" means we finished South 4 (or whatever). Everyone's wind is back to ...?
    // No.
    // Simple logic: Find who started as East in THIS game. Next person becomes East.
    // Since we don't track "Who started as East", we can just assume:
    // If we assume `room.players` ARRAY ORDER is the physical seat order (Top, Right, Opp, Left),
    // And we assume "Next Game" means "Right person becomes East".
    
    // Let's implement: Shift winds: East -> North, South -> East, West -> South, North -> West.
    // (Everyone moves "up" in wind? No. East moves to next player.)
    // If Player A was East, now Player B (Right) becomes East.
    // So Player A becomes North. Player B becomes East.
    
    // Wind Rotation Logic:
    const windOrder: Player['wind'][] = ['East', 'South', 'West', 'North'];
    
    // Current players with their LAST winds.
    // We want to shift winds so that "East" moves to the Next Seat.
    // Assuming `players[0]` is Seat 1, `players[1]` Seat 2...
    // We need to know who WAS the *Initial* East? 
    // We don't have that stored.
    // BUT, usually "Next Game" in friendly set implies just rotating the dealer.
    
    // Alternative: We just `room.players` array order is fixed.
    // We find current `gameResults.length`. 
    // 1st Game: players[0] is East.
    // 2nd Game: players[1] is East.
    // etc.
    // This is robust!
    
    const nextGameIndex = (room.gameResults?.length || 0); // If 1 result exists, next is Index 1.
    const playerCount = room.players.length;
    const nextDealerIndex = nextGameIndex % playerCount;
    
    const newPlayers = room.players.map((p, index) => {
        // Index 0: East. Index 1: South... IF nextDealerIndex is 0.
        // If nextDealerIndex is 1. players[1] is East. players[2] is South. players[0] is North.
        // (index - nextDealerIndex)
        // windOrder: E, S, W, N.
        // players[nextDealerIndex] should be E (0).
        // rel = (index - nextDealerIndex)
        const rel = (index - nextDealerIndex + playerCount) % playerCount;
        return {
            ...p,
            wind: windOrder[rel],
            score: room.settings.startPoint,
            isRiichi: false,
            // chip: p.chip // Chips preserved
        };
    });

    await updateState({
        players: newPlayers,
        round: {
            wind: 'East',
            number: 1,
            honba: 0,
            riichiSticks: 0
        },
        status: 'playing',
        history: [], // Clear undo history
        // leave gameResults as is
    });
  };

  if (loading) return <div>Loading Room...</div>;
  if (!room) return <div>Room not found or error. <Button onClick={() => navigate('/')}>Top</Button></div>;

  // Determine if we just finished (transition start)
  const isJustFinished = room.status === 'finished' && prevStatusRef.current !== 'finished' && prevStatusRef.current !== undefined;

  if (room.status === 'finished' && !isTransitioning && !isJustFinished) {
    return <ResultView room={room} onNextGame={handleNextGame} />;
  }

  const currentDealer = room.players.find(p => p.wind === 'East');

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <span>Room: {room.id}</span>
        <span>Room: {room.id}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="small" variant="secondary" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Copied URL");
            }}>Share</Button>
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
            const { history: _h, ...snapshot } = room;
            const newHistory = [...(room.history || []), snapshot];
            
            // Update
            const newPlayers = room.players.map(p => {
                if (p.id === playerId) {
                    return { ...p, score: p.score - 1000, isRiichi: true };
                }
                return p;
            });
            const newRound = { ...room.round, riichiSticks: room.round.riichiSticks + 1 };
            
            await updateState({
                players: newPlayers,
                round: newRound,
                history: newHistory as RoomState[] 
            });
        }}
        onCenterClick={handleCenterClick} 
        useChip={room.settings.useChip}
      />
      
      {/* Undo Button */}
      {room.history && room.history.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleUndo} 
              style={{ padding: '8px 16px', fontSize: '16px' }}
            >
              Undo ({room.history.length})
            </button>
          </div>
      )}

      {/* Scoring Modal */}
      <ScoringModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        players={room.players}
        dealerId={currentDealer?.id || room.players[0]?.id || ''}
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
          <input 
            value={joinName} 
            onChange={e => setJoinName(e.target.value)} 
            style={{ padding: '8px', fontSize: '16px' }}
          />
          <Button onClick={handleJoinSubmit} disabled={!joinName}>Join Game</Button>
        </div>

      </Modal>

      {/* Menu Modal */}
      <Modal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="メニュー">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Button onClick={() => { setIsMenuOpen(false); setIsHistoryOpen(true); }} size="large">
            戦績 (History)
          </Button>
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
    </div>
  );
};

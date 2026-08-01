import { useState } from 'react';
import type { LastEvent, Player, RoomState } from '../../types';
import { getCurrentPlayerRanks } from '../../utils/resultCalculator';
import { windToKanji } from '../../utils/wind';
import { AnimatedScore } from '../ui/AnimatedScore';
import { Button } from '../ui/Button';
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
            {windToKanji(round.wind)} {round.number} 局
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
        <div className={styles.windBadge}>{windToKanji(player.wind)}</div>
        <div className={styles.playerName}>{player.name}</div>
        {isYakitori && <div className={styles.yakitoriBadge}>🐔</div>}
      </div>

      {/* Body: Score + Deltas */}
      <div className={styles.cardBody}>
        <AnimatedScore
          playerId={player.id}
          score={player.score}
          lastEvent={lastEvent}
          size="large"
          className={styles.playerScore}
          onDisplayScoreChange={onDisplayScoreChange}
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

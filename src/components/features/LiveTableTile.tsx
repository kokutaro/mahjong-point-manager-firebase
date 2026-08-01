import type { CompetitionParticipant, CompetitionTable, RoomState } from '../../types';
import { windToKanji } from '../../utils/wind';
import { AnimatedScore } from '../ui/AnimatedScore';
import styles from './LiveTableTile.module.css';

const STATUS_LABELS: Record<string, string> = {
  open: '空席あり',
  ready: '準備完了',
  playing: '対局中',
  finished: '終了',
};

const STATUS_STYLE: Record<string, string> = {
  open: styles.statusOpen,
  ready: styles.statusReady,
  playing: styles.statusPlaying,
  finished: styles.statusFinished,
};

const formatRound = (room: RoomState): string => {
  const wind = windToKanji(room.round.wind);
  const num = room.round.number;
  const honba = room.round.honba;
  const base = `${wind}${num}局`;
  return honba > 0 ? `${base} ${honba}本場` : base;
};

interface LiveTableTileProps {
  table: CompetitionTable;
  room: RoomState | null;
  participants: CompetitionParticipant[];
}

export const LiveTableTile = ({ table, room, participants }: LiveTableTileProps) => {
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const isPlaying = room?.status === 'playing';
  const isFinished =
    table.status === 'finished' || room?.status === 'finished' || room?.status === 'ended';
  const showRoomInfo = room && (isPlaying || isFinished);

  const tileClass = [
    styles.tile,
    isPlaying ? styles.playing : '',
    isFinished ? styles.finished : '',
  ]
    .filter(Boolean)
    .join(' ');

  const effectiveStatus = isPlaying ? 'playing' : isFinished ? 'finished' : table.status;

  return (
    <div className={tileClass}>
      <div className={styles.header}>
        <span className={styles.name}>{table.name}</span>
        <div className={styles.badges}>
          <span className={styles.modeBadge}>{table.mode === '3ma' ? '3麻' : '4麻'}</span>
          <span className={STATUS_STYLE[effectiveStatus] ?? styles.statusOpen}>
            {STATUS_LABELS[effectiveStatus]}
          </span>
        </div>
      </div>

      {showRoomInfo && (
        <div>
          <span className={styles.roundInfo}>{formatRound(room)}</span>
          {table.gameCount > 0 && <span className={styles.gameCount}>第{table.gameCount}戦</span>}
        </div>
      )}

      {showRoomInfo ? (
        <div className={styles.players}>
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`${styles.playerRow} ${player.isRiichi ? styles.riichi : ''}`}
              aria-label={player.isRiichi ? `${player.name}はリーチ中` : undefined}
            >
              <span className={styles.wind}>{windToKanji(player.wind)}</span>
              <span className={styles.playerIdentity}>
                <span className={styles.playerName}>{player.name}</span>
                {player.isRiichi && <span className={styles.riichiBadge}>リーチ</span>}
              </span>
              <AnimatedScore
                playerId={player.id}
                score={player.score}
                lastEvent={room.lastEvent}
                size="medium"
                className={styles.score}
              />
            </div>
          ))}
        </div>
      ) : table.playerIds.length > 0 ? (
        <div className={styles.players}>
          {table.playerIds.map((pid) => {
            const p = participantMap.get(pid);
            const seat = table.seatAssignment?.[pid];
            return (
              <div key={pid} className={styles.playerRow}>
                <span className={styles.wind}>{seat ? windToKanji(seat) : ''}</span>
                <span className={styles.playerName}>{p?.name ?? pid}</span>
                <span className={styles.score}>-</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.idle}>プレイヤー未配置</div>
      )}
    </div>
  );
};

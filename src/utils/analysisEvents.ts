import type {
  CompetitionGameResult,
  CompetitionParticipant,
  HandLog,
  Player,
  RoomState,
} from '../types';
import type { AnalysisEventType, AnalysisSource, Wind } from '../types/analysis';
import { getAnalysisEventType } from './analysis';

const EVENT_LABELS: Record<AnalysisEventType, string> = {
  win: '和了',
  'deal-in': '放銃',
  'tenpai-draw': 'テンパイ流局',
};

const WIND_LABELS: Record<Wind, string> = {
  East: '東',
  South: '南',
  West: '西',
  North: '北',
};

const WIND_ORDER: Wind[] = ['East', 'South', 'West', 'North'];

export interface AnalysisEventPlayer {
  id: string;
  name: string;
  wind: Wind;
}

export interface AnalysisEventSummary {
  id: string;
  source: AnalysisSource;
  handLog: HandLog;
  players: AnalysisEventPlayer[];
  eventType: AnalysisEventType;
  eventLabel: string;
  roundLabel: string;
  locationLabel: string;
  summary: string;
  scoreDeltaLabel: string;
  timestamp: number;
}

const createPlayerMap = (players: AnalysisEventPlayer[]) => {
  return new Map(players.map((player) => [player.id, player]));
};

const clonePlayers = (players: Pick<Player, 'id' | 'name' | 'wind'>[]): AnalysisEventPlayer[] => {
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    wind: player.wind,
  }));
};

const formatSignedNumber = (value: number): string => {
  const formatted = Math.abs(value).toLocaleString('ja-JP');
  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return '0';
};

const formatWinnerNames = (
  handLog: HandLog,
  playerMap: Map<string, AnalysisEventPlayer>,
): string => {
  return (
    handLog.result.winners
      ?.map((winner) => playerMap.get(winner.id)?.name ?? winner.id)
      .join('・') ?? '不明'
  );
};

const formatEventSummary = (
  handLog: HandLog,
  eventType: AnalysisEventType,
  playerMap: Map<string, AnalysisEventPlayer>,
): string => {
  if (eventType === 'win') {
    if (handLog.result.loserId) {
      const loserName = playerMap.get(handLog.result.loserId)?.name ?? handLog.result.loserId;
      return `${loserName}から和了`;
    }

    return 'ツモ和了';
  }

  if (eventType === 'deal-in') {
    return `${formatWinnerNames(handLog, playerMap)}に放銃`;
  }

  const tenpaiNames =
    handLog.result.tenpaiPlayerIds
      ?.map((tenpaiPlayerId) => playerMap.get(tenpaiPlayerId)?.name ?? tenpaiPlayerId)
      .join('・') ?? '自分';

  return `${tenpaiNames} テンパイ`;
};

const buildEventSummary = (
  handLog: HandLog,
  players: AnalysisEventPlayer[],
  playerId: string,
  source: AnalysisSource,
  locationLabel: string,
): AnalysisEventSummary | null => {
  const eventType = getAnalysisEventType(handLog, playerId);
  if (!eventType) {
    return null;
  }

  const playerMap = createPlayerMap(players);

  return {
    id: [source.kind, source.handLogId, source.gameResultId ?? '', source.roomId ?? ''].join(':'),
    source,
    handLog,
    players,
    eventType,
    eventLabel: EVENT_LABELS[eventType],
    roundLabel: `${WIND_LABELS[handLog.round.wind]}${handLog.round.number}局 ${handLog.round.honba}本場`,
    locationLabel,
    summary: formatEventSummary(handLog, eventType, playerMap),
    scoreDeltaLabel: formatSignedNumber(handLog.result.scoreDeltas[playerId] ?? 0),
    timestamp: handLog.timestamp,
  };
};

const buildRoomPlayerSnapshots = (
  room: RoomState,
  totalLogCount: number,
): AnalysisEventPlayer[][] => {
  const historySnapshots = room.history ?? [];

  return Array.from({ length: totalLogCount }, (_, index) => {
    const snapshot = historySnapshots[index];
    return clonePlayers(snapshot?.players ?? room.players);
  });
};

export const getTimestampValue = (value: number | object | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object' && 'seconds' in value) {
    return (value as { seconds: number }).seconds * 1000;
  }

  return 0;
};

export const buildRoomAnalysisEvents = (
  room: RoomState,
  playerId: string,
): AnalysisEventSummary[] => {
  const finishedLogs = (room.gameResults ?? []).flatMap((gameResult, index) => {
    return (gameResult.logs ?? []).map((handLog) => ({
      handLog,
      source: {
        kind: 'room' as const,
        roomId: room.id,
        handLogId: handLog.id,
      },
      locationLabel: `第${index + 1}戦`,
    }));
  });

  const currentLogs = (room.currentLogs ?? []).map((handLog) => ({
    handLog,
    source: {
      kind: 'room' as const,
      roomId: room.id,
      handLogId: handLog.id,
    },
    locationLabel: '進行中の対局',
  }));

  const allLogs = [...finishedLogs, ...currentLogs];
  const playerSnapshots = buildRoomPlayerSnapshots(room, allLogs.length);

  return allLogs
    .map((entry, index) => {
      return buildEventSummary(
        entry.handLog,
        playerSnapshots[index] ?? clonePlayers(room.players),
        playerId,
        entry.source,
        entry.locationLabel,
      );
    })
    .filter((entry): entry is AnalysisEventSummary => entry !== null)
    .sort((left, right) => right.timestamp - left.timestamp);
};

const buildCompetitionPlayers = (
  participantIds: string[],
  participants: CompetitionParticipant[],
): AnalysisEventPlayer[] => {
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]));

  return participantIds.map((participantId, index) => {
    const participant = participantMap.get(participantId);
    return {
      id: participant?.userId ?? participant?.id ?? participantId,
      name: participant?.name ?? participantId,
      wind: WIND_ORDER[index] ?? 'North',
    };
  });
};

export const buildCompetitionAnalysisEvents = (
  competitionId: string,
  gameResults: CompetitionGameResult[],
  participants: CompetitionParticipant[],
  playerId: string,
): AnalysisEventSummary[] => {
  return gameResults
    .flatMap((gameResult) => {
      const players = buildCompetitionPlayers(gameResult.participantIds, participants);

      return (gameResult.result.logs ?? []).map((handLog) => {
        return buildEventSummary(
          handLog,
          players,
          playerId,
          {
            kind: 'competition',
            competitionId,
            gameResultId: gameResult.result.id,
            handLogId: handLog.id,
          },
          `${gameResult.tableName} / 第${gameResult.gameIndex}戦`,
        );
      });
    })
    .filter((entry): entry is AnalysisEventSummary => entry !== null)
    .sort((left, right) => right.timestamp - left.timestamp);
};

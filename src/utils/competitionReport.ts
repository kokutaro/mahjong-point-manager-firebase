import type { CompetitionGameResult, CompetitionParticipant, CompetitionTable } from '../types';

export interface OverallStanding {
  rank: number;
  participantId: string;
  name: string;
  gameCount: number;
  totalPoint: number;
  averageRank: number;
  totalChip: number;
}

export interface MatchDetail {
  tableName: string;
  gameIndex: number;
  participantId: string;
  name: string;
  rank: number;
  rawScore: number;
  point: number;
  chipDiff: number;
  timestamp: number;
}

export interface TableSummary {
  tableId: string;
  tableName: string;
  mode: '3ma' | '4ma';
  gameCount: number;
  participantNames: string[];
}

/**
 * Build a mapping from playerId (which may be Firebase UID) back to participant.
 * For guest players, playerId === participant.id.
 * For account users, playerId === participant.userId.
 */
const buildPlayerToParticipantMap = (
  participants: CompetitionParticipant[],
): Map<string, CompetitionParticipant> => {
  const map = new Map<string, CompetitionParticipant>();
  for (const p of participants) {
    map.set(p.id, p);
    if (p.userId) {
      map.set(p.userId, p);
    }
  }
  return map;
};

const resolveParticipant = (
  playerId: string,
  participantIds: string[],
  playerMap: Map<string, CompetitionParticipant>,
): CompetitionParticipant | undefined => {
  // Direct match by playerId
  const direct = playerMap.get(playerId);
  if (direct) return direct;
  // Fallback: check participantIds
  for (const pid of participantIds) {
    const p = playerMap.get(pid);
    if (p && (p.userId === playerId || p.id === playerId)) return p;
  }
  return undefined;
};

export const aggregateOverallStandings = (
  gameResults: CompetitionGameResult[],
  participants: CompetitionParticipant[],
): OverallStanding[] => {
  if (gameResults.length === 0) return [];

  const playerMap = buildPlayerToParticipantMap(participants);

  // Accumulate per-participant stats
  const statsMap = new Map<
    string,
    { name: string; totalPoint: number; rankSum: number; gameCount: number; totalChip: number }
  >();

  for (const gr of gameResults) {
    for (const score of gr.result.scores) {
      const participant = resolveParticipant(score.playerId, gr.participantIds, playerMap);
      const participantId = participant?.id ?? score.playerId;
      const name = participant?.name ?? score.name;

      const existing = statsMap.get(participantId);
      if (existing) {
        statsMap.set(participantId, {
          name: existing.name,
          totalPoint: existing.totalPoint + score.point,
          rankSum: existing.rankSum + score.rank,
          gameCount: existing.gameCount + 1,
          totalChip: existing.totalChip + score.chipDiff,
        });
      } else {
        statsMap.set(participantId, {
          name,
          totalPoint: score.point,
          rankSum: score.rank,
          gameCount: 1,
          totalChip: score.chipDiff,
        });
      }
    }
  }

  // Sort by totalPoint descending
  const entries = [...statsMap.entries()]
    .map(([participantId, stats]) => ({
      participantId,
      name: stats.name,
      gameCount: stats.gameCount,
      totalPoint: stats.totalPoint,
      averageRank: Math.round((stats.rankSum / stats.gameCount) * 10) / 10,
      totalChip: stats.totalChip,
    }))
    .sort((a, b) => b.totalPoint - a.totalPoint);

  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};

export const aggregateMatchDetails = (
  gameResults: CompetitionGameResult[],
  participants: CompetitionParticipant[],
): MatchDetail[] => {
  if (gameResults.length === 0) return [];

  const playerMap = buildPlayerToParticipantMap(participants);
  const details: MatchDetail[] = [];

  const sorted = [...gameResults].sort((a, b) => a.timestamp - b.timestamp);

  for (const gr of sorted) {
    for (const score of gr.result.scores) {
      const participant = resolveParticipant(score.playerId, gr.participantIds, playerMap);
      details.push({
        tableName: gr.tableName,
        gameIndex: gr.gameIndex,
        participantId: participant?.id ?? score.playerId,
        name: participant?.name ?? score.name,
        rank: score.rank,
        rawScore: score.rawScore,
        point: score.point,
        chipDiff: score.chipDiff,
        timestamp: gr.timestamp,
      });
    }
  }

  return details;
};

export const aggregateTableSummary = (
  tables: CompetitionTable[],
  participants: CompetitionParticipant[],
  gameResults: CompetitionGameResult[],
): TableSummary[] => {
  if (tables.length === 0) return [];

  const participantMap = new Map(participants.map((p) => [p.id, p]));

  // Collect unique participant IDs per table from game results
  const tableParticipantIds = new Map<string, Set<string>>();
  for (const gr of gameResults) {
    const existing = tableParticipantIds.get(gr.tableId) ?? new Set<string>();
    for (const pid of gr.participantIds) {
      existing.add(pid);
    }
    tableParticipantIds.set(gr.tableId, existing);
  }

  return tables
    .map((table) => {
      const pids = tableParticipantIds.get(table.id) ?? new Set<string>();
      // Also include currently assigned players
      for (const pid of table.playerIds) {
        pids.add(pid);
      }
      const participantNames = [...pids].map((pid) => participantMap.get(pid)?.name ?? pid).sort();

      return {
        tableId: table.id,
        tableName: table.name,
        mode: table.mode,
        gameCount: table.gameCount,
        participantNames,
      };
    })
    .sort((a, b) => a.tableName.localeCompare(b.tableName, 'ja'));
};

import type {
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionTable,
  TableRank,
} from '../types';
import { getTableCapacity } from './tableLogic';

export const TABLE_RANKS: readonly TableRank[] = [1, 2, 3, 4, 5];
export const DEFAULT_TABLE_RANK: TableRank = 1;

export interface AutoAssignmentParticipant {
  id: string;
  name: string;
  gameCount: number;
  totalPoint: number;
  averageRank: number | null;
}

export interface AutoAssignmentTable {
  tableId: string;
  tableName: string;
  rank: TableRank;
  mode: '3ma' | '4ma';
  existingParticipants: Array<{ id: string; name: string }>;
  participants: AutoAssignmentParticipant[];
}

export interface AutoTableAssignmentProposal {
  tables: AutoAssignmentTable[];
  assignmentCount: number;
  unassignedParticipantIds: string[];
  standingSource: 'competition' | 'series';
}

export interface SeriesStandingForAssignment {
  seriesMemberId: string;
  gameCount: number;
  totalPoint: number;
  averageRank: number;
}

export interface AutoTableAssignmentOptions {
  source: 'series';
  standings: SeriesStandingForAssignment[];
}

interface ParticipantStanding extends AutoAssignmentParticipant {
  joinedAt: number;
}

export const getTableRank = (table: Pick<CompetitionTable, 'rank'>): TableRank =>
  table.rank ?? DEFAULT_TABLE_RANK;

const getTimestamp = (value: unknown): number => {
  if (typeof value === 'number') return value;

  const timestamp = value as { toMillis?: () => number };
  return timestamp.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
};

const buildParticipantLookup = (
  participants: CompetitionParticipant[],
): Map<string, CompetitionParticipant> => {
  const lookup = new Map<string, CompetitionParticipant>();
  for (const participant of participants) {
    lookup.set(participant.id, participant);
    if (participant.userId) lookup.set(participant.userId, participant);
  }
  return lookup;
};

const buildStandings = (
  participants: CompetitionParticipant[],
  gameResults: CompetitionGameResult[],
  options?: AutoTableAssignmentOptions,
): ParticipantStanding[] => {
  const useSeriesStandings = options?.source === 'series' && gameResults.length === 0;
  const seriesStats = new Map(
    useSeriesStandings
      ? options.standings.map((standing) => [standing.seriesMemberId, standing] as const)
      : [],
  );
  const participantLookup = buildParticipantLookup(participants);
  const stats = new Map<string, { totalPoint: number; rankSum: number; gameCount: number }>();

  for (const gameResult of gameResults) {
    for (const score of gameResult.result.scores) {
      const participant = participantLookup.get(score.playerId);
      if (!participant) continue;

      const current = stats.get(participant.id) ?? { totalPoint: 0, rankSum: 0, gameCount: 0 };
      current.totalPoint += score.point;
      current.rankSum += score.rank;
      current.gameCount += 1;
      stats.set(participant.id, current);
    }
  }

  return participants
    .filter((participant) => participant.status === 'idle')
    .map((participant) => {
      const participantStats = stats.get(participant.id);
      const seriesStanding = participant.seriesMemberId
        ? seriesStats.get(participant.seriesMemberId)
        : undefined;
      return {
        id: participant.id,
        name: participant.name,
        gameCount: seriesStanding?.gameCount ?? participantStats?.gameCount ?? 0,
        totalPoint: seriesStanding?.totalPoint ?? participantStats?.totalPoint ?? 0,
        averageRank:
          seriesStanding?.averageRank ??
          (participantStats ? participantStats.rankSum / participantStats.gameCount : null),
        joinedAt: getTimestamp(participant.joinedAt),
      };
    })
    .sort((a, b) => {
      if (a.totalPoint !== b.totalPoint) return b.totalPoint - a.totalPoint;
      if (a.averageRank !== b.averageRank) {
        return (
          (a.averageRank ?? Number.POSITIVE_INFINITY) - (b.averageRank ?? Number.POSITIVE_INFINITY)
        );
      }
      if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
      return a.id.localeCompare(b.id);
    });
};

export const buildAutoTableAssignment = (
  tables: CompetitionTable[],
  participants: CompetitionParticipant[],
  gameResults: CompetitionGameResult[],
  options?: AutoTableAssignmentOptions,
): AutoTableAssignmentProposal => {
  const standingSource =
    options?.source === 'series' && gameResults.length === 0 ? 'series' : 'competition';
  const standings = buildStandings(participants, gameResults, options);
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]));
  let standingIndex = 0;

  const eligibleTables = tables
    .filter((table) => {
      if (table.status !== 'open' && table.status !== 'ready') return false;
      return table.playerIds.length < getTableCapacity(table.mode);
    })
    .sort(
      (a, b) =>
        getTableRank(a) - getTableRank(b) ||
        getTimestamp(a.createdAt) - getTimestamp(b.createdAt) ||
        a.name.localeCompare(b.name, 'ja') ||
        a.id.localeCompare(b.id),
    );

  const proposalTables: AutoAssignmentTable[] = [];
  for (const table of eligibleTables) {
    const remainingSlots = getTableCapacity(table.mode) - table.playerIds.length;
    const assigned = standings.slice(standingIndex, standingIndex + remainingSlots);
    standingIndex += assigned.length;
    if (assigned.length === 0) break;

    proposalTables.push({
      tableId: table.id,
      tableName: table.name,
      rank: getTableRank(table),
      mode: table.mode,
      existingParticipants: table.playerIds.map((participantId) => ({
        id: participantId,
        name: participantMap.get(participantId)?.name ?? participantId,
      })),
      participants: assigned.map((participant) => ({
        id: participant.id,
        name: participant.name,
        gameCount: participant.gameCount,
        totalPoint: participant.totalPoint,
        averageRank: participant.averageRank,
      })),
    });
  }

  return {
    tables: proposalTables,
    assignmentCount: standingIndex,
    unassignedParticipantIds: standings.slice(standingIndex).map((participant) => participant.id),
    standingSource,
  };
};

export const areAutoTableAssignmentProposalsEqual = (
  left: AutoTableAssignmentProposal,
  right: AutoTableAssignmentProposal,
): boolean => JSON.stringify(left) === JSON.stringify(right);

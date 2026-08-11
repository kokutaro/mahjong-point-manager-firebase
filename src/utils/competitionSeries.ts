import type {
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionSeriesMember,
} from '../types';

export interface CompetitionSeriesRoundData {
  competitionId: string;
  competitionName: string;
  roundNumber: number;
  participants: CompetitionParticipant[];
  gameResults: CompetitionGameResult[];
}

export interface CompetitionSeriesRoundStanding {
  competitionId: string;
  competitionName: string;
  roundNumber: number;
  gameCount: number;
  totalPoint: number;
  averageRank: number;
  totalChip: number;
}

export interface CompetitionSeriesStanding {
  rank: number;
  seriesMemberId: string;
  name: string;
  gameCount: number;
  totalPoint: number;
  averageRank: number;
  totalChip: number;
  appearanceCount: number;
  rounds: CompetitionSeriesRoundStanding[];
}

export interface UnlinkedSeriesParticipant {
  competitionId: string;
  competitionName: string;
  roundNumber: number;
  participantId: string;
  name: string;
}

export interface CompetitionSeriesAggregation {
  standings: CompetitionSeriesStanding[];
  unlinkedParticipants: UnlinkedSeriesParticipant[];
}

export interface CompetitionParticipantImportPlan {
  newMembers: Array<Omit<CompetitionSeriesMember, 'joinedAt'>>;
  mappings: Array<{ participantId: string; seriesMemberId: string }>;
  skippedParticipantIds: string[];
}

interface MutableStats {
  totalPoint: number;
  rankSum: number;
  gameCount: number;
  totalChip: number;
}

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

const addScore = (stats: MutableStats, point: number, rank: number, chipDiff: number): void => {
  stats.totalPoint += point;
  stats.rankSum += rank;
  stats.gameCount += 1;
  stats.totalChip += chipDiff;
};

const emptyStats = (): MutableStats => ({
  totalPoint: 0,
  rankSum: 0,
  gameCount: 0,
  totalChip: 0,
});

const normalizeIdentityName = (name: string): string => name.trim().toLocaleLowerCase('ja-JP');

export const buildCompetitionParticipantImportPlan = (
  members: CompetitionSeriesMember[],
  participants: CompetitionParticipant[],
  createMemberId: () => string,
): CompetitionParticipantImportPlan => {
  const newMembers: CompetitionParticipantImportPlan['newMembers'] = [];
  const mappings: CompetitionParticipantImportPlan['mappings'] = [];
  const skippedParticipantIds: string[] = [];
  const usedMemberIds = new Set(
    participants.flatMap((participant) =>
      participant.seriesMemberId ? [participant.seriesMemberId] : [],
    ),
  );

  for (const participant of participants) {
    if (participant.seriesMemberId) {
      skippedParticipantIds.push(participant.id);
      continue;
    }

    const candidates = [...members, ...newMembers].filter(
      (member) => !usedMemberIds.has(member.id),
    );
    const userIdMatches = participant.userId
      ? candidates.filter((member) => member.userId === participant.userId)
      : [];
    const nameMatches = candidates.filter(
      (member) => normalizeIdentityName(member.name) === normalizeIdentityName(participant.name),
    );
    const matchedMember =
      userIdMatches.length === 1
        ? userIdMatches[0]
        : nameMatches.length === 1
          ? nameMatches[0]
          : undefined;
    const seriesMemberId = matchedMember?.id ?? createMemberId();

    if (!matchedMember) {
      newMembers.push({
        id: seriesMemberId,
        ...(participant.userId ? { userId: participant.userId } : {}),
        name: participant.name.trim(),
        active: true,
      });
    }
    usedMemberIds.add(seriesMemberId);
    mappings.push({ participantId: participant.id, seriesMemberId });
  }

  return { newMembers, mappings, skippedParticipantIds };
};

export const aggregateCompetitionSeriesStandings = (
  members: CompetitionSeriesMember[],
  rounds: CompetitionSeriesRoundData[],
): CompetitionSeriesAggregation => {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const totalByMember = new Map<string, MutableStats>();
  const appearancesByMember = new Map<string, Set<string>>();
  const roundStatsByMember = new Map<string, Map<string, MutableStats>>();
  const unlinked = new Map<string, UnlinkedSeriesParticipant>();

  for (const round of rounds) {
    const participants = buildParticipantLookup(round.participants);
    for (const gameResult of round.gameResults) {
      for (const score of gameResult.result.scores) {
        const participant = participants.get(score.playerId);
        if (!participant?.seriesMemberId || !memberById.has(participant.seriesMemberId)) {
          const participantId = participant?.id ?? score.playerId;
          const key = `${round.competitionId}:${participantId}`;
          unlinked.set(key, {
            competitionId: round.competitionId,
            competitionName: round.competitionName,
            roundNumber: round.roundNumber,
            participantId,
            name: participant?.name ?? score.name,
          });
          continue;
        }

        const memberId = participant.seriesMemberId;
        const total = totalByMember.get(memberId) ?? emptyStats();
        addScore(total, score.point, score.rank, score.chipDiff);
        totalByMember.set(memberId, total);

        const appearances = appearancesByMember.get(memberId) ?? new Set<string>();
        appearances.add(round.competitionId);
        appearancesByMember.set(memberId, appearances);

        const memberRounds = roundStatsByMember.get(memberId) ?? new Map<string, MutableStats>();
        const roundStats = memberRounds.get(round.competitionId) ?? emptyStats();
        addScore(roundStats, score.point, score.rank, score.chipDiff);
        memberRounds.set(round.competitionId, roundStats);
        roundStatsByMember.set(memberId, memberRounds);
      }
    }
  }

  const standings = [...totalByMember.entries()]
    .map(([seriesMemberId, stats]) => {
      const member = memberById.get(seriesMemberId)!;
      const memberRoundStats = roundStatsByMember.get(seriesMemberId) ?? new Map();
      const roundDetails = rounds
        .filter((round) => memberRoundStats.has(round.competitionId))
        .map((round) => {
          const roundStats = memberRoundStats.get(round.competitionId)!;
          return {
            competitionId: round.competitionId,
            competitionName: round.competitionName,
            roundNumber: round.roundNumber,
            gameCount: roundStats.gameCount,
            totalPoint: roundStats.totalPoint,
            averageRank: roundStats.rankSum / roundStats.gameCount,
            totalChip: roundStats.totalChip,
          };
        })
        .sort(
          (a, b) => a.roundNumber - b.roundNumber || a.competitionId.localeCompare(b.competitionId),
        );

      return {
        seriesMemberId,
        name: member.name,
        gameCount: stats.gameCount,
        totalPoint: stats.totalPoint,
        averageRank: stats.rankSum / stats.gameCount,
        totalChip: stats.totalChip,
        appearanceCount: appearancesByMember.get(seriesMemberId)?.size ?? 0,
        rounds: roundDetails,
        joinedAt: getTimestamp(member.joinedAt),
      };
    })
    .sort((a, b) => {
      if (a.totalPoint !== b.totalPoint) return b.totalPoint - a.totalPoint;
      if (a.averageRank !== b.averageRank) return a.averageRank - b.averageRank;
      if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
      return a.seriesMemberId.localeCompare(b.seriesMemberId);
    })
    .map((standing, index) => ({
      rank: index + 1,
      seriesMemberId: standing.seriesMemberId,
      name: standing.name,
      gameCount: standing.gameCount,
      totalPoint: standing.totalPoint,
      averageRank: standing.averageRank,
      totalChip: standing.totalChip,
      appearanceCount: standing.appearanceCount,
      rounds: standing.rounds,
    }));

  return {
    standings,
    unlinkedParticipants: [...unlinked.values()].sort(
      (a, b) =>
        a.roundNumber - b.roundNumber ||
        a.competitionName.localeCompare(b.competitionName, 'ja') ||
        a.name.localeCompare(b.name, 'ja') ||
        a.participantId.localeCompare(b.participantId),
    ),
  };
};

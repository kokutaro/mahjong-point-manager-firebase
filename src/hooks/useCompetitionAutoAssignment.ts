import { useMemo, useState } from 'react';
import { applyAutoTableAssignment } from '../services/competitionService';
import type {
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionSeriesMember,
  CompetitionTable,
} from '../types';
import {
  areAutoTableAssignmentProposalsEqual,
  buildAutoTableAssignment,
  type AutoTableAssignmentProposal,
  type SeriesStandingForAssignment,
} from '../utils/autoTableAssignment';
import { aggregateCompetitionSeriesStandings } from '../utils/competitionSeries';
import type { CompetitionSeriesRoundView } from './useCompetitionSeries';

interface UseCompetitionAutoAssignmentOptions {
  competitionId: string;
  seriesId?: string;
  tables: CompetitionTable[];
  participants: CompetitionParticipant[];
  gameResults: CompetitionGameResult[];
  seriesMembers: CompetitionSeriesMember[];
  seriesRounds: CompetitionSeriesRoundView[];
  showSnackbar: (message: string) => void;
}

export const useCompetitionAutoAssignment = ({
  competitionId,
  seriesId,
  tables,
  participants,
  gameResults,
  seriesMembers,
  seriesRounds,
  showSnackbar,
}: UseCompetitionAutoAssignmentOptions) => {
  const [proposal, setProposal] = useState<AutoTableAssignmentProposal | null>(null);

  const previousSeriesStandings = useMemo<SeriesStandingForAssignment[]>(() => {
    if (!seriesId) return [];
    const aggregation = aggregateCompetitionSeriesStandings(
      seriesMembers,
      seriesRounds.flatMap((item) =>
        item.competition && item.competition.id !== competitionId
          ? [
              {
                competitionId: item.competition.id,
                competitionName: item.competition.name,
                roundNumber: item.round.roundNumber,
                participants: item.participants,
                gameResults: item.gameResults,
              },
            ]
          : [],
      ),
    );
    return aggregation.standings.map((standing) => ({
      seriesMemberId: standing.seriesMemberId,
      gameCount: standing.gameCount,
      totalPoint: standing.totalPoint,
      averageRank: standing.averageRank,
    }));
  }, [competitionId, seriesId, seriesMembers, seriesRounds]);

  const canUseSeriesStandings =
    Boolean(seriesId) && gameResults.length === 0 && previousSeriesStandings.length > 0;

  const buildProposal = (source: 'competition' | 'series'): AutoTableAssignmentProposal =>
    buildAutoTableAssignment(
      tables,
      participants,
      gameResults,
      source === 'series' ? { source: 'series', standings: previousSeriesStandings } : undefined,
    );

  const openProposal = (source: 'competition' | 'series') => {
    setProposal(buildProposal(source));
  };

  const confirmProposal = async (candidate: AutoTableAssignmentProposal): Promise<boolean> => {
    if (!competitionId) return false;
    const currentProposal = buildProposal(candidate.standingSource);
    if (!areAutoTableAssignmentProposalsEqual(candidate, currentProposal)) {
      setProposal(currentProposal);
      showSnackbar('大会の状況が変わったため、割当案を更新しました。もう一度確認してください');
      return false;
    }

    try {
      await applyAutoTableAssignment(competitionId, candidate);
      showSnackbar(`${candidate.assignmentCount}人を自動アサインしました`);
      return true;
    } catch (error) {
      console.error('Failed to apply auto assignment:', error);
      showSnackbar('自動アサインに失敗しました。割当案を作り直してください');
      setProposal(buildProposal(candidate.standingSource));
      return false;
    }
  };

  return {
    proposal,
    canUseSeriesStandings,
    openCompetitionProposal: () => openProposal('competition'),
    openSeriesProposal: () => openProposal('series'),
    closeProposal: () => setProposal(null),
    confirmProposal,
  };
};

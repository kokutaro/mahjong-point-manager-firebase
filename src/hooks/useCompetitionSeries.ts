import { useEffect, useState } from 'react';
import {
  subscribeToCompetition,
  subscribeToGameResults,
  subscribeToParticipants,
} from '../services/competitionService';
import {
  subscribeToCompetitionSeries,
  subscribeToCompetitionSeriesMembers,
  subscribeToCompetitionSeriesRounds,
} from '../services/competitionSeriesService';
import type {
  Competition,
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionSeries,
  CompetitionSeriesMember,
  CompetitionSeriesRound,
} from '../types';

export interface CompetitionSeriesRoundView {
  round: CompetitionSeriesRound;
  competition: Competition | null;
  participants: CompetitionParticipant[];
  gameResults: CompetitionGameResult[];
}

interface SeriesBaseState {
  seriesId: string;
  series: CompetitionSeries | null;
  members: CompetitionSeriesMember[];
  roundDefinitions: CompetitionSeriesRound[];
  loaded: { series: boolean; members: boolean; rounds: boolean };
}

interface RoundDetailsState {
  key: string;
  values: Record<string, Partial<Omit<CompetitionSeriesRoundView, 'round'>>>;
}

const EMPTY_BASE_STATE: SeriesBaseState = {
  seriesId: '',
  series: null,
  members: [],
  roundDefinitions: [],
  loaded: { series: false, members: false, rounds: false },
};

export const useCompetitionSeries = (seriesId: string) => {
  const [baseState, setBaseState] = useState<SeriesBaseState>(EMPTY_BASE_STATE);
  const [roundDetails, setRoundDetails] = useState<RoundDetailsState>({ key: '', values: {} });
  const activeBase = baseState.seriesId === seriesId ? baseState : EMPTY_BASE_STATE;
  const { series, members, roundDefinitions } = activeBase;
  const definitionKey = roundDefinitions
    .map((round) => `${round.id}:${round.competitionId}`)
    .join('|');

  useEffect(() => {
    if (!seriesId) return;

    const updateBase = (update: (current: SeriesBaseState) => SeriesBaseState) => {
      setBaseState((current) =>
        update(current.seriesId === seriesId ? current : { ...EMPTY_BASE_STATE, seriesId }),
      );
    };
    const unsubscribeSeries = subscribeToCompetitionSeries(seriesId, (value) => {
      updateBase((current) => ({
        ...current,
        series: value,
        loaded: { ...current.loaded, series: true },
      }));
    });
    const unsubscribeMembers = subscribeToCompetitionSeriesMembers(seriesId, (value) => {
      updateBase((current) => ({
        ...current,
        members: value,
        loaded: { ...current.loaded, members: true },
      }));
    });
    const unsubscribeRounds = subscribeToCompetitionSeriesRounds(seriesId, (value) => {
      updateBase((current) => ({
        ...current,
        roundDefinitions: value,
        loaded: { ...current.loaded, rounds: true },
      }));
    });

    return () => {
      unsubscribeSeries();
      unsubscribeMembers();
      unsubscribeRounds();
    };
  }, [seriesId]);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    const updateRound = (
      roundId: string,
      update: Partial<Omit<CompetitionSeriesRoundView, 'round'>>,
    ) => {
      setRoundDetails((current) => ({
        key: definitionKey,
        values: {
          ...(current.key === definitionKey ? current.values : {}),
          [roundId]: {
            ...(current.key === definitionKey ? current.values[roundId] : {}),
            ...update,
          },
        },
      }));
    };

    for (const round of roundDefinitions) {
      unsubscribes.push(
        subscribeToCompetition(round.competitionId, (competition) =>
          updateRound(round.id, { competition }),
        ),
        subscribeToParticipants(round.competitionId, (participants) =>
          updateRound(round.id, { participants }),
        ),
        subscribeToGameResults(round.competitionId, (gameResults) =>
          updateRound(round.id, { gameResults }),
        ),
      );
    }

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [definitionKey, roundDefinitions]);

  const activeRoundDetails = roundDetails.key === definitionKey ? roundDetails.values : {};
  const roundDetailsLoading = roundDefinitions.some((round) => {
    const details = activeRoundDetails[round.id];
    return (
      !details ||
      !Object.prototype.hasOwnProperty.call(details, 'competition') ||
      !Object.prototype.hasOwnProperty.call(details, 'participants') ||
      !Object.prototype.hasOwnProperty.call(details, 'gameResults')
    );
  });
  const rounds = roundDefinitions.map((round) => ({
    round,
    competition: activeRoundDetails[round.id]?.competition ?? null,
    participants: activeRoundDetails[round.id]?.participants ?? [],
    gameResults: activeRoundDetails[round.id]?.gameResults ?? [],
  }));

  return {
    series,
    members,
    rounds,
    roundDetailsLoading,
    loading:
      Boolean(seriesId) &&
      (!activeBase.loaded.series || !activeBase.loaded.members || !activeBase.loaded.rounds),
  };
};

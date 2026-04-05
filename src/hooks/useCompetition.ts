import { useEffect, useState } from 'react';
import {
  subscribeToCompetition,
  subscribeToGameResults,
  subscribeToParticipants,
  subscribeToTables,
} from '../services/competitionService';
import type {
  Competition,
  CompetitionGameResult,
  CompetitionParticipant,
  CompetitionTable,
} from '../types';

export const useCompetition = (competitionId: string) => {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [participants, setParticipants] = useState<CompetitionParticipant[]>([]);
  const [tables, setTables] = useState<CompetitionTable[]>([]);
  const [gameResults, setGameResults] = useState<CompetitionGameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!competitionId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    let loadCount = 0;
    const checkLoaded = () => {
      loadCount += 1;
      if (loadCount >= 4) {
        setLoading(false);
      }
    };

    const unsubCompetition = subscribeToCompetition(competitionId, (data) => {
      setCompetition(data);
      if (!data) {
        setError(new Error('Competition not found'));
      }
      checkLoaded();
    });

    const unsubParticipants = subscribeToParticipants(competitionId, (data) => {
      setParticipants(data);
      checkLoaded();
    });

    const unsubTables = subscribeToTables(competitionId, (data) => {
      setTables(data);
      checkLoaded();
    });

    const unsubGameResults = subscribeToGameResults(competitionId, (data) => {
      setGameResults(data);
      checkLoaded();
    });

    return () => {
      unsubCompetition();
      unsubParticipants();
      unsubTables();
      unsubGameResults();
    };
  }, [competitionId]);

  return { competition, participants, tables, gameResults, loading, error };
};

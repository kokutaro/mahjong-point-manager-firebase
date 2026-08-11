import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { getUserCompetitionSeries } from '../services/competitionSeriesService';
import type { CompetitionSeries } from '../types';

export const useCompetitionSeriesList = () => {
  const { authReady, uid } = useAuth();
  const [series, setSeries] = useState<CompetitionSeries[]>([]);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !uid) return;
    getUserCompetitionSeries(uid)
      .then((items) => {
        setSeries(items);
        setLoadedUid(uid);
      })
      .catch(() => setLoadedUid(uid));
  }, [authReady, uid]);

  return {
    series: uid && loadedUid === uid ? series : [],
    loading: authReady && uid !== null && loadedUid !== uid,
  };
};

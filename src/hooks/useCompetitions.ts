import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { getUserCompetitions } from '../services/competitionService';
import type { Competition } from '../types';

export const useCompetitions = () => {
  const { authReady, uid } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !uid) {
      return;
    }

    getUserCompetitions(uid)
      .then((data) => {
        setCompetitions(data);
        setLoadedUid(uid);
      })
      .catch(() => setLoadedUid(uid));
  }, [authReady, uid]);

  return {
    competitions: uid && loadedUid === uid ? competitions : [],
    loading: authReady && uid !== null && loadedUid !== uid,
  };
};

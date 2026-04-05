import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserCompetitions } from '../services/competitionService';
import { auth } from '../services/firebase';
import type { Competition } from '../types';

export const useCompetitions = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      getUserCompetitions(user.uid)
        .then((data) => {
          setCompetitions(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
    return () => unsubscribe();
  }, []);

  return { competitions, loading };
};

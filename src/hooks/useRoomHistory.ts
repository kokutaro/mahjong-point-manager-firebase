import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { getUserRoomHistory } from '../services/roomService';
import type { RoomState } from '../types';

export const useRoomHistory = () => {
  const { authReady, uid } = useAuth();
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [errorUid, setErrorUid] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !uid) {
      return;
    }

    getUserRoomHistory(uid)
      .then((history) => {
        setRooms(history);
        setLoadedUid(uid);
        setError(null);
        setErrorUid(uid);
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError : new Error(String(nextError)));
        setLoadedUid(uid);
        setErrorUid(uid);
      });
  }, [authReady, uid]);

  return {
    rooms: uid && loadedUid === uid ? rooms : [],
    loading: authReady && uid !== null && loadedUid !== uid,
    error: uid && errorUid === uid ? error : null,
  };
};

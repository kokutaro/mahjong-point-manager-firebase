import { useEffect, useState } from 'react';
import { joinRoom, subscribeToRoom, updateRoomState } from '../services/roomService';
import type { Player, RoomState } from '../types';

export const useRoom = (roomId: string) => {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToRoom(roomId, (data: RoomState | null) => {
      setRoom(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  const join = async (player: Player) => {
    try {
      await joinRoom(roomId, player);
    } catch (e: any) {
      setError(e);
      throw e;
    }
  };

  const updateState = async (updates: Partial<RoomState>) => {
    try {
      await updateRoomState(roomId, updates);
    } catch (e: any) {
      setError(e);
      console.error(e);
    }
  };

  return { room, loading, error, join, updateState };
};

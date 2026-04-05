import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeToRoom } from '../services/roomService';
import type { CompetitionTable, RoomState } from '../types';
import { diffRoomIds, extractRoomIds } from '../utils/liveRoomUtils';

export const useLiveRooms = (tables: CompetitionTable[]) => {
  const [rooms, setRooms] = useState<Map<string, RoomState>>(new Map());
  const [loading, setLoading] = useState(true);
  const listenersRef = useRef<Map<string, () => void>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());

  const roomIds = useMemo(() => extractRoomIds(tables), [tables]);

  const roomIdsKey = roomIds.join(',');

  // Unmount-only cleanup: release all listeners when the component unmounts
  useEffect(() => {
    const listeners = listenersRef.current;
    return () => {
      for (const unsub of listeners.values()) {
        unsub();
      }
      listeners.clear();
    };
  }, []);

  // Incremental sync: add/remove listeners based on diff
  useEffect(() => {
    const currentListeners = listenersRef.current;
    const currentIds = new Set(roomIds);
    const previousIds = new Set(currentListeners.keys());
    const { added, removed } = diffRoomIds(previousIds, currentIds);

    // Remove listeners for roomIds that are no longer present
    for (const id of removed) {
      currentListeners.get(id)?.();
      currentListeners.delete(id);
      pendingRef.current.delete(id);
      setRooms((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }

    // Add listeners for new roomIds
    for (const id of added) {
      pendingRef.current.add(id);
      const unsub = subscribeToRoom(id, (data) => {
        pendingRef.current.delete(id);
        if (pendingRef.current.size === 0) {
          setLoading(false);
        }
        setRooms((prev) => {
          if (data) {
            const next = new Map(prev);
            next.set(id, data);
            return next;
          }
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      });
      currentListeners.set(id, unsub);
    }

    // If no roomIds to subscribe to, immediately mark as loaded
    if (currentIds.size === 0) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdsKey]);

  return { rooms, loading };
};

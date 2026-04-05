import { useCallback, useMemo } from 'react';
import {
  dissolveTable as dissolveTableService,
  saveCompetitionGameResult,
  startNextTableMatch,
  startTableMatch,
} from '../services/competitionService';
import { createRoom } from '../services/roomService';
import type {
  CompetitionParticipant,
  CompetitionTable,
  GameResult,
  GameSettings,
  RoomState,
} from '../types';
import {
  buildGameSettingsFromCompetition,
  buildPlayersFromParticipants,
} from '../utils/competitionDefaults';
import { generateId } from '../utils/id';
import { useCompetition } from './useCompetition';
import { useRoom } from './useRoom';
import { auth } from '../services/firebase';

export type MatchPhase = 'lobby' | 'playing' | 'finished' | 'loading';

export interface UseCompetitionMatchReturn {
  competition: ReturnType<typeof useCompetition>['competition'];
  table: CompetitionTable | undefined;
  participants: CompetitionParticipant[];
  room: RoomState | null;
  roomLoading: boolean;
  canManage: boolean;
  updateState: (updates: Partial<RoomState>) => Promise<void>;
  startMatch: () => Promise<void>;
  saveResult: (gameResult: GameResult) => Promise<void>;
  startNextMatch: () => Promise<void>;
  dissolveTable: () => Promise<void>;
  matchPhase: MatchPhase;
  loading: boolean;
  gameSettings: GameSettings | null;
}

export const useCompetitionMatch = (
  competitionId: string,
  tableId: string,
): UseCompetitionMatchReturn => {
  const { competition, participants, tables, loading: compLoading } = useCompetition(competitionId);

  const table = useMemo(() => tables.find((t) => t.id === tableId), [tables, tableId]);

  const roomId = table?.currentRoomId || '';
  const { room, loading: roomLoading, updateState } = useRoom(roomId);

  const tableParticipants = useMemo(
    () => participants.filter((p) => table?.playerIds.includes(p.id)),
    [participants, table?.playerIds],
  );

  const canManage = useMemo(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !competition) return false;
    return competition.organizerId === uid || competition.coOrganizerIds.includes(uid);
  }, [competition]);

  const gameSettings = useMemo(() => {
    if (!competition || !table) return null;
    return buildGameSettingsFromCompetition(competition.settings, table.mode);
  }, [competition, table]);

  const matchPhase: MatchPhase = useMemo(() => {
    if (compLoading || (roomId && roomLoading)) return 'loading';
    if (!roomId || !room || room.status === 'waiting') return 'lobby';
    if (room.status === 'playing') return 'playing';
    if (room.status === 'finished' || room.status === 'ended') return 'finished';
    return 'lobby';
  }, [compLoading, roomId, roomLoading, room]);

  const loading = compLoading || (!!roomId && roomLoading);

  const startMatch = useCallback(async () => {
    if (!competition || !table || !gameSettings) return;

    const seatAssignment = table.seatAssignment ?? {};
    const players = buildPlayersFromParticipants(
      tableParticipants,
      seatAssignment,
      gameSettings.startPoint,
    );
    const newRoomId = generateId(8);

    await createRoom(newRoomId, players, gameSettings, undefined, { competitionId, tableId });
    await startTableMatch(competitionId, tableId, newRoomId, table.playerIds);
    // Transition the room to 'playing' immediately (createRoom sets 'waiting')
    const { updateRoomState } = await import('../services/roomService');
    await updateRoomState(newRoomId, { status: 'playing' });
  }, [competition, table, gameSettings, tableParticipants, competitionId, tableId]);

  const saveResult = useCallback(
    async (gameResult: GameResult) => {
      if (!table) return;
      const competitionResult = {
        id: `${tableId}_${gameResult.id}`,
        tableId,
        tableName: table.name,
        gameIndex: table.gameCount || 0,
        result: gameResult,
        participantIds: table.playerIds,
        timestamp: Date.now(),
      };
      await saveCompetitionGameResult(competitionId, competitionResult);
    },
    [table, competitionId, tableId],
  );

  const startNextMatch = useCallback(async () => {
    if (!room || !gameSettings || !table) return;

    // Preserve seat order from the previous game, reset scores
    const windOrder: ('East' | 'South' | 'West' | 'North')[] = ['East', 'South', 'West', 'North'];
    const newPlayers = room.players.map((p, idx) => ({
      ...p,
      score: gameSettings.startPoint,
      chip: 0,
      isRiichi: false,
      wind: windOrder[idx] || 'North',
    }));

    const newRoomId = generateId(8);
    await createRoom(newRoomId, newPlayers, gameSettings, undefined, { competitionId, tableId });
    await startNextTableMatch(competitionId, tableId, newRoomId, (table.gameCount || 0) + 1);
    // Transition the room to 'playing' immediately
    const { updateRoomState } = await import('../services/roomService');
    await updateRoomState(newRoomId, { status: 'playing' });
  }, [room, gameSettings, table, competitionId, tableId]);

  const dissolveTable = useCallback(async () => {
    if (!table) return;
    await dissolveTableService(competitionId, tableId, table.playerIds);
  }, [table, competitionId, tableId]);

  return {
    competition,
    table,
    participants: tableParticipants,
    room,
    roomLoading,
    canManage,
    updateState,
    startMatch,
    saveResult,
    startNextMatch,
    dissolveTable,
    matchPhase,
    loading,
    gameSettings,
  };
};

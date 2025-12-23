/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';
import type { GameResult, RoomState } from '../types';
import { checkUserHasAnonymousHistory, migrateUserData } from './migrationService';

// Mock values hoisted
const mocks = vi.hoisted(() => {
  const mockCommit = vi.fn();
  const mockUpdate = vi.fn();
  const mockWriteBatch = vi.fn(() => ({
    update: mockUpdate,
    commit: mockCommit,
  }));
  const mockGetDocs = vi.fn();

  // Helper for setting return value of getDocs
  // We can't access non-hoisted variables easily, so we will expose getDocs and mockImplementation later.

  return {
    mockCommit,
    mockUpdate,
    mockWriteBatch,
    mockGetDocs,
    mockDoc: vi.fn((_db, _coll, id) => ({ id, path: `rooms/${id}` })),
    mockCollection: vi.fn(),
    mockQuery: vi.fn(),
    mockWhere: vi.fn(),
    mockRunTransaction: vi.fn(),
  };
});

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: mocks.mockCollection,
  doc: mocks.mockDoc,
  getDocs: mocks.mockGetDocs,
  query: mocks.mockQuery,
  where: mocks.mockWhere,
  writeBatch: mocks.mockWriteBatch,
  runTransaction: mocks.mockRunTransaction,
}));

vi.mock('./firebase', () => ({
  db: {},
}));

describe('migrationService', () => {
  describe('checkUserHasAnonymousHistory', () => {
    it('should return true if documents exist', async () => {
      mocks.mockGetDocs.mockResolvedValue({ empty: false });
      const result = await checkUserHasAnonymousHistory('some-uid');
      expect(result).toBe(true);
      expect(mocks.mockQuery).toHaveBeenCalled();
    });

    it('should return false if no documents exist', async () => {
      mocks.mockGetDocs.mockResolvedValue({ empty: true });
      const result = await checkUserHasAnonymousHistory('some-uid');
      expect(result).toBe(false);
    });
  });

  describe('migrateUserData', () => {
    it('should migrate simple room data', async () => {
      const oldUid = 'old-user';
      const newUid = 'new-user';

      // Setup mock data
      const room1: RoomState = {
        id: 'room1',
        hostId: oldUid,
        status: 'playing',
        settings: {} as any,
        round: {} as any,
        players: [
          { id: oldUid, name: 'Old', score: 25000, wind: 'East', isRiichi: false, chip: 0 },
          { id: 'other', name: 'Other', score: 25000, wind: 'South', isRiichi: false, chip: 0 },
        ],
        playerIds: [oldUid, 'other'],
        gameResults: [],
      };

      // Set return value of getDocs
      mocks.mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: room1.id,
            data: () => room1,
          },
        ],
      });

      await migrateUserData(oldUid, newUid);

      expect(mocks.mockUpdate).toHaveBeenCalledTimes(1);
      const [ref, updates] = mocks.mockUpdate.mock.calls[0];
      expect(ref.id).toBe('room1');
      expect(updates.hostId).toBe(newUid);
      expect(updates.playerIds).toContain(newUid);
      expect(updates.playerIds).not.toContain(oldUid);
      expect(updates.players[0].id).toBe(newUid);
    });

    it('should migrate game results and logs', async () => {
      const oldUid = 'old-user';
      const newUid = 'new-user';

      const game: GameResult = {
        id: 'game1',
        timestamp: 123,
        ruleSnapshot: {} as any,
        scores: [
          { playerId: oldUid, name: 'Old', rank: 1, rawScore: 30000, point: 50, chipDiff: 0 },
          { playerId: 'other', name: 'Other', rank: 2, rawScore: 20000, point: -10, chipDiff: 0 },
        ],
        logs: [
          {
            id: 'log1',
            timestamp: 123,
            round: {} as any,
            result: {
              type: 'Win',
              winners: [{ id: oldUid, payment: {} as any }],
              loserId: null,
              riichiPlayerIds: [oldUid],
              scoreDeltas: { [oldUid]: 2000, other: -2000 },
            },
          },
        ],
      };

      const room2: RoomState = {
        id: 'room2',
        hostId: 'other',
        status: 'playing',
        settings: {} as any,
        round: {} as any,
        players: [
          { id: 'other', name: 'Other', score: 25000, wind: 'East', isRiichi: false, chip: 0 },
          { id: oldUid, name: 'Old', score: 25000, wind: 'South', isRiichi: false, chip: 0 },
        ],
        playerIds: ['other', oldUid],
        gameResults: [game],
      };

      mocks.mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          {
            id: room2.id,
            data: () => room2,
          },
        ],
      });

      mocks.mockUpdate.mockClear();

      await migrateUserData(oldUid, newUid);

      expect(mocks.mockUpdate).toHaveBeenCalledTimes(1);
      const [, updates] = mocks.mockUpdate.mock.calls[0];

      // playerIds
      expect(updates.playerIds).toEqual(['other', newUid]);

      // gameResults
      const updatedGame = updates.gameResults[0];
      expect(updatedGame.scores[0].playerId).toBe(newUid);

      // logs
      const updatedLog = updatedGame.logs[0];
      expect(updatedLog.result.winners[0].id).toBe(newUid);
      expect(updatedLog.result.riichiPlayerIds).toEqual([newUid]);
      expect(updatedLog.result.scoreDeltas[newUid]).toBe(2000);
      expect(updatedLog.result.scoreDeltas[oldUid]).toBeUndefined();
    });

    it('should migrate loserId in game logs', async () => {
      const oldUid = 'old-user';
      const newUid = 'new-user';

      const game: GameResult = {
        id: 'game_loser',
        timestamp: 123,
        ruleSnapshot: {} as any,
        scores: [],
        logs: [
          {
            id: 'log_loser',
            timestamp: 123,
            round: {} as any,
            result: {
              type: 'Win',
              winners: [], // irrelevant for this test
              loserId: oldUid,
              scoreDeltas: {},
            },
          },
        ],
      };

      const room: RoomState = {
        id: 'room_loser',
        hostId: 'other',
        status: 'finished',
        settings: {} as any,
        round: {} as any,
        players: [],
        playerIds: [oldUid],
        gameResults: [game],
      };

      mocks.mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: room.id, data: () => room }],
      });
      mocks.mockUpdate.mockClear();

      await migrateUserData(oldUid, newUid);

      const [, updates] = mocks.mockUpdate.mock.calls[0];
      expect(updates.gameResults[0].logs[0].result.loserId).toBe(newUid);
    });

    it('should migrate lastEvent deltas', async () => {
      const oldUid = 'old-user';
      const newUid = 'new-user';

      const room: RoomState = {
        id: 'room_event',
        hostId: 'other',
        status: 'playing',
        settings: {} as any,
        round: {} as any,
        players: [],
        playerIds: [oldUid],
        lastEvent: {
          id: 'event1',
          type: 'score_change',
          deltas: {
            [oldUid]: { hand: 1000, sticks: 0 },
            ['other']: { hand: -1000, sticks: 0 },
          },
        },
      };

      mocks.mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: room.id, data: () => room }],
      });
      mocks.mockUpdate.mockClear();

      await migrateUserData(oldUid, newUid);

      const [, updates] = mocks.mockUpdate.mock.calls[0];
      expect(updates.lastEvent.deltas[newUid]).toEqual({ hand: 1000, sticks: 0 });
      expect(updates.lastEvent.deltas[oldUid]).toBeUndefined();
    });

    it('should handle games where user is not involved', async () => {
      const oldUid = 'old-user';
      const newUid = 'new-user';

      const game: GameResult = {
        id: 'game_other',
        timestamp: 123,
        ruleSnapshot: {} as any,
        scores: [
          { playerId: 'p1', name: 'P1', rank: 1, rawScore: 30000, point: 50, chipDiff: 0 },
          { playerId: 'p2', name: 'P2', rank: 2, rawScore: 20000, point: -10, chipDiff: 0 },
        ],
        logs: [], // No logs to simplify
      };

      const room: RoomState = {
        id: 'room_no_match',
        hostId: oldUid, // host triggers update
        status: 'finished',
        settings: {} as any,
        round: {} as any,
        players: [],
        playerIds: [oldUid],
        gameResults: [game],
      };

      mocks.mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: room.id, data: () => room }],
      });
      mocks.mockUpdate.mockClear();

      await migrateUserData(oldUid, newUid);

      expect(mocks.mockUpdate).toHaveBeenCalledTimes(1);
      const [, updates] = mocks.mockUpdate.mock.calls[0];

      // hostId migrated
      expect(updates.hostId).toBe(newUid);

      // gameResults should be inclued in updates because we map over it
      // BUT structurally they might be identical references if not changed?
      // In our implementation, we map over gameResults.
      // If gameUpdated is false, we return 'game'.
      // The `updates.gameResults` will be a NEW array, but containing SAME game objects.
      // `needsUpdate` is set to true unconditionally if gameResults exists.
      // So updates.gameResults should be present.
      expect(updates.gameResults).toBeDefined();
      expect(updates.gameResults![0]).toBe(game); // Should be same reference
    });
  });
});

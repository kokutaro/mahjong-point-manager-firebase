/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addGameResult,
  addGuestParticipant,
  addParticipant,
  applyAutoTableAssignment,
  appointCoOrganizer,
  assignPlayerToTable,
  assignPlayersToTable,
  COMPETITION_COLLECTION,
  createCompetition,
  createTable,
  deleteTable,
  deleteTableWithCleanup,
  dissolveTable,
  getParticipant,
  getUserCompetitions,
  removeCoOrganizer,
  removeParticipant,
  saveCompetitionGameResult,
  savePasscodeSecret,
  startNextTableMatch,
  startTableMatch,
  subscribeToCompetition,
  subscribeToGameResults,
  subscribeToParticipants,
  subscribeToTables,
  unassignPlayerFromTable,
  updateCompetition,
  updateParticipant,
  updateTable,
  verifyPasscode,
} from './competitionService';

// Mock values hoisted
const mocks = vi.hoisted(() => ({
  mockSetDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockDoc: vi.fn((_db: any, ...pathSegments: string[]) => ({
    id: pathSegments[pathSegments.length - 1],
    path: pathSegments.join('/'),
  })),
  mockCollection: vi.fn((_db: any, ...pathSegments: string[]) => ({
    path: pathSegments.join('/'),
  })),
  mockServerTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  mockQuery: vi.fn((...args: any[]) => ({ _query: args })),
  mockWhere: vi.fn((...args: any[]) => ({ _where: args })),
  mockGetDocs: vi.fn(),
  mockGetDoc: vi.fn(),
  mockHashPasscode: vi.fn(),
  mockArrayUnion: vi.fn((...args: any[]) => ({ _arrayUnion: args })),
  mockArrayRemove: vi.fn((...args: any[]) => ({ _arrayRemove: args })),
  mockGenerateId: vi.fn(() => 'generated-id'),
  mockWriteBatch: vi.fn(),
  mockBatchSet: vi.fn(),
  mockBatchUpdate: vi.fn(),
  mockBatchDelete: vi.fn(),
  mockBatchCommit: vi.fn(),
  mockRunTransaction: vi.fn(),
  mockTransactionGet: vi.fn(),
  mockTransactionUpdate: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: mocks.mockCollection,
  doc: mocks.mockDoc,
  setDoc: mocks.mockSetDoc,
  updateDoc: mocks.mockUpdateDoc,
  deleteDoc: mocks.mockDeleteDoc,
  onSnapshot: mocks.mockOnSnapshot,
  serverTimestamp: mocks.mockServerTimestamp,
  query: mocks.mockQuery,
  where: mocks.mockWhere,
  getDocs: mocks.mockGetDocs,
  getDoc: mocks.mockGetDoc,
  arrayUnion: mocks.mockArrayUnion,
  arrayRemove: mocks.mockArrayRemove,
  writeBatch: (...args: any[]) => {
    mocks.mockWriteBatch(...args);
    return {
      set: mocks.mockBatchSet,
      update: mocks.mockBatchUpdate,
      delete: mocks.mockBatchDelete,
      commit: mocks.mockBatchCommit,
    };
  },
  runTransaction: async (_db: any, callback: any) => {
    mocks.mockRunTransaction();
    return callback({
      get: mocks.mockTransactionGet,
      update: mocks.mockTransactionUpdate,
    });
  },
}));

vi.mock('../utils/hash', () => ({
  hashPasscode: mocks.mockHashPasscode,
}));

vi.mock('../utils/id', () => ({
  generateId: mocks.mockGenerateId,
}));

vi.mock('./firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } },
}));

describe('competitionService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('COMPETITION_COLLECTION constant', () => {
    it('should be "competitions"', () => {
      expect(COMPETITION_COLLECTION).toBe('competitions');
    });
  });

  describe('createCompetition', () => {
    it('should call setDoc with correct arguments when no passcode', async () => {
      const competition = {
        id: 'comp-1',
        name: 'Test Competition',
        organizerId: 'user-1',
        coOrganizerIds: [],
        status: 'recruiting' as const,
        hasPasscode: false,
        settings: {} as any,
      };

      await createCompetition(competition);

      expect(mocks.mockDoc).toHaveBeenCalledWith(expect.anything(), 'competitions', 'comp-1');
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'comp-1' }),
        expect.objectContaining({
          ...competition,
          createdAt: 'SERVER_TIMESTAMP',
        }),
      );
    });

    it('should use writeBatch when passcodeHash is provided', async () => {
      const competition = {
        id: 'comp-2',
        name: 'Passcode Competition',
        organizerId: 'user-1',
        coOrganizerIds: [],
        status: 'recruiting' as const,
        hasPasscode: true,
        settings: {} as any,
      };
      mocks.mockBatchCommit.mockResolvedValue(undefined);

      await createCompetition(competition, 'hashed-pass');

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('subscribeToCompetition', () => {
    it('should call onSnapshot and return data via callback', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();

      mocks.mockOnSnapshot.mockImplementation((_ref: any, onNext: any) => {
        onNext({
          exists: () => true,
          data: () => ({ id: 'comp-1', name: 'Test' }),
        });
        return mockUnsubscribe;
      });

      const unsubscribe = subscribeToCompetition('comp-1', callback);

      expect(mocks.mockDoc).toHaveBeenCalledWith(expect.anything(), 'competitions', 'comp-1');
      expect(mocks.mockOnSnapshot).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith({ id: 'comp-1', name: 'Test' });
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should return null when document does not exist', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();

      mocks.mockOnSnapshot.mockImplementation((_ref: any, onNext: any) => {
        onNext({
          exists: () => false,
          data: () => null,
        });
        return mockUnsubscribe;
      });

      subscribeToCompetition('comp-1', callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('updateCompetition', () => {
    it('should call updateDoc with correct arguments', async () => {
      await updateCompetition('comp-1', { name: 'Updated Name' });

      expect(mocks.mockDoc).toHaveBeenCalledWith(expect.anything(), 'competitions', 'comp-1');
      expect(mocks.mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'comp-1' }),
        expect.objectContaining({ name: 'Updated Name' }),
      );
    });
  });

  describe('addParticipant', () => {
    it('should call setDoc on the participants subcollection', async () => {
      const participant = {
        id: 'participant-1',
        userId: 'user-1',
        name: 'Player 1',
        isGuest: false,
        status: 'idle' as const,
        role: 'player' as const,
      };

      await addParticipant('comp-1', participant);

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'participants',
        'participant-1',
      );
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'participant-1' }),
        expect.objectContaining({
          ...participant,
          joinedAt: 'SERVER_TIMESTAMP',
        }),
      );
    });
  });

  describe('subscribeToParticipants', () => {
    it('should call onSnapshot on the participants subcollection and return list', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();

      mocks.mockOnSnapshot.mockImplementation((_ref: any, onNext: any) => {
        onNext({
          docs: [
            { data: () => ({ id: 'p1', name: 'Player 1' }) },
            { data: () => ({ id: 'p2', name: 'Player 2' }) },
          ],
        });
        return mockUnsubscribe;
      });

      const unsubscribe = subscribeToParticipants('comp-1', callback);

      expect(mocks.mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'participants',
      );
      expect(callback).toHaveBeenCalledWith([
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
      ]);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('updateParticipant', () => {
    it('should call updateDoc on the participant document', async () => {
      await updateParticipant('comp-1', 'participant-1', { status: 'playing' });

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'participants',
        'participant-1',
      );
      expect(mocks.mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'participant-1' }),
        expect.objectContaining({ status: 'playing' }),
      );
    });
  });

  describe('removeParticipant', () => {
    it('should call deleteDoc on the participant document', async () => {
      await removeParticipant('comp-1', 'participant-1');

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'participants',
        'participant-1',
      );
      expect(mocks.mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'participant-1' }),
      );
    });
  });

  describe('getParticipant', () => {
    it('should return participant data when document exists', async () => {
      const participantData = {
        id: 'p-1',
        name: 'Test',
        isGuest: false,
        role: 'player',
        status: 'idle',
      };
      mocks.mockGetDoc.mockResolvedValue({ exists: () => true, data: () => participantData });

      const result = await getParticipant('comp-1', 'p-1');
      expect(result).toEqual(participantData);
      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'participants',
        'p-1',
      );
    });

    it('should return null when document does not exist', async () => {
      mocks.mockGetDoc.mockResolvedValue({ exists: () => false });

      const result = await getParticipant('comp-1', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('subscribeToTables', () => {
    it('should call onSnapshot on the tables subcollection and return list', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();

      mocks.mockOnSnapshot.mockImplementation((_ref: any, onNext: any) => {
        onNext({
          docs: [
            { data: () => ({ id: 't1', name: 'Table 1' }) },
            { data: () => ({ id: 't2', name: 'Table 2' }) },
          ],
        });
        return mockUnsubscribe;
      });

      const unsubscribe = subscribeToTables('comp-1', callback);

      expect(mocks.mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'tables',
      );
      expect(callback).toHaveBeenCalledWith([
        { id: 't1', name: 'Table 1' },
        { id: 't2', name: 'Table 2' },
      ]);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('createTable', () => {
    it('should call setDoc on the tables subcollection with defaults', async () => {
      const table = {
        id: 'table-1',
        name: 'Table 1',
        rank: 1 as const,
        mode: '4ma' as const,
        status: 'open' as const,
        playerIds: [],
      };

      await createTable('comp-1', table);

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'tables',
        'table-1',
      );
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({
          ...table,
          gameCount: 0,
          createdAt: 'SERVER_TIMESTAMP',
        }),
      );
    });
  });

  describe('updateTable', () => {
    it('should call updateDoc on the table document', async () => {
      await updateTable('comp-1', 'table-1', { status: 'playing' });

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'tables',
        'table-1',
      );
      expect(mocks.mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({ status: 'playing' }),
      );
    });
  });

  describe('applyAutoTableAssignment', () => {
    it('atomically fills proposed table seats and marks participants assigned', async () => {
      const tables = [
        {
          id: 'table-1',
          name: 'A卓',
          rank: 1 as const,
          mode: '4ma' as const,
          status: 'open' as const,
          playerIds: ['manual-player'],
          gameCount: 0,
          createdAt: 1,
        },
      ];
      const proposal = {
        tables: [
          {
            tableId: 'table-1',
            tableName: 'A卓',
            rank: 1 as const,
            mode: '4ma' as const,
            existingParticipants: [{ id: 'manual-player', name: 'Manual' }],
            participants: [
              {
                id: 'p1',
                name: 'P1',
                gameCount: 1,
                totalPoint: 10,
                averageRank: 1,
              },
              {
                id: 'p2',
                name: 'P2',
                gameCount: 0,
                totalPoint: 0,
                averageRank: null,
              },
            ],
          },
        ],
        assignmentCount: 2,
        unassignedParticipantIds: [],
      };

      mocks.mockTransactionGet.mockImplementation(async (ref: { id: string; path: string }) => ({
        exists: () => true,
        data: () =>
          ref.path.includes('/tables/')
            ? tables[0]
            : { id: ref.id, status: 'idle', currentTableId: '' },
      }));

      await applyAutoTableAssignment('comp-1', proposal);

      expect(mocks.mockTransactionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({
          playerIds: ['manual-player', 'p1', 'p2'],
          status: 'open',
          seatAssignment: {
            'manual-player': 'East',
            p1: 'South',
            p2: 'West',
          },
        }),
      );
      expect(mocks.mockTransactionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        { status: 'assigned', currentTableId: 'table-1' },
      );
      expect(mocks.mockTransactionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p2' }),
        { status: 'assigned', currentTableId: 'table-1' },
      );
      expect(mocks.mockRunTransaction).toHaveBeenCalledTimes(1);
    });

    it('rejects stale proposals that exceed capacity', async () => {
      const tables = [
        {
          id: 'table-1',
          name: 'A卓',
          rank: 1 as const,
          mode: '3ma' as const,
          status: 'open' as const,
          playerIds: ['p0', 'p-existing'],
          gameCount: 0,
          createdAt: 1,
        },
      ];
      const proposal = {
        tables: [
          {
            tableId: 'table-1',
            tableName: 'A卓',
            rank: 1 as const,
            mode: '3ma' as const,
            existingParticipants: [
              { id: 'p0', name: 'P0' },
              { id: 'p-existing', name: 'Existing' },
            ],
            participants: [
              { id: 'p1', name: 'P1', gameCount: 0, totalPoint: 0, averageRank: null },
              { id: 'p2', name: 'P2', gameCount: 0, totalPoint: 0, averageRank: null },
            ],
          },
        ],
        assignmentCount: 2,
        unassignedParticipantIds: [],
      };

      mocks.mockTransactionGet.mockImplementation(async (ref: { id: string; path: string }) => ({
        exists: () => true,
        data: () =>
          ref.path.includes('/tables/')
            ? tables[0]
            : { id: ref.id, status: 'idle', currentTableId: '' },
      }));

      await expect(applyAutoTableAssignment('comp-1', proposal)).rejects.toThrow(
        'Auto assignment proposal is stale',
      );
      expect(mocks.mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('rejects a participant assigned elsewhere after the proposal was shown', async () => {
      const proposal = {
        tables: [
          {
            tableId: 'table-1',
            tableName: 'A卓',
            rank: 1 as const,
            mode: '4ma' as const,
            existingParticipants: [],
            participants: [
              { id: 'p1', name: 'P1', gameCount: 0, totalPoint: 0, averageRank: null },
            ],
          },
        ],
        assignmentCount: 1,
        unassignedParticipantIds: [],
      };
      mocks.mockTransactionGet.mockImplementation(async (ref: { id: string; path: string }) => ({
        exists: () => true,
        data: () =>
          ref.path.includes('/tables/')
            ? {
                id: 'table-1',
                name: 'A卓',
                rank: 1,
                mode: '4ma',
                status: 'open',
                playerIds: [],
              }
            : { id: 'p1', status: 'assigned', currentTableId: 'other-table' },
      }));

      await expect(applyAutoTableAssignment('comp-1', proposal)).rejects.toThrow(
        'Auto assignment proposal is stale',
      );
      expect(mocks.mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('rejects a table mode changed after the proposal was shown', async () => {
      const proposal = {
        tables: [
          {
            tableId: 'table-1',
            tableName: 'A卓',
            rank: 1 as const,
            mode: '4ma' as const,
            existingParticipants: [],
            participants: [
              { id: 'p1', name: 'P1', gameCount: 0, totalPoint: 0, averageRank: null },
            ],
          },
        ],
        assignmentCount: 1,
        unassignedParticipantIds: [],
      };
      mocks.mockTransactionGet.mockImplementation(async (ref: { id: string; path: string }) => ({
        exists: () => true,
        data: () =>
          ref.path.includes('/tables/')
            ? {
                id: 'table-1',
                name: 'A卓',
                rank: 1,
                mode: '3ma',
                status: 'open',
                playerIds: [],
              }
            : { id: 'p1', status: 'idle', currentTableId: '' },
      }));

      await expect(applyAutoTableAssignment('comp-1', proposal)).rejects.toThrow(
        'Auto assignment proposal is stale',
      );
      expect(mocks.mockTransactionUpdate).not.toHaveBeenCalled();
    });

    it('rejects duplicate table ids in a malformed proposal', async () => {
      const tableProposal = {
        tableId: 'table-1',
        tableName: 'A卓',
        rank: 1 as const,
        mode: '4ma' as const,
        existingParticipants: [],
        participants: [{ id: 'p1', name: 'P1', gameCount: 0, totalPoint: 0, averageRank: null }],
      };

      await expect(
        applyAutoTableAssignment('comp-1', {
          tables: [tableProposal, { ...tableProposal, participants: [] }],
          assignmentCount: 1,
          unassignedParticipantIds: [],
        }),
      ).rejects.toThrow('Auto assignment proposal is stale');
      expect(mocks.mockRunTransaction).not.toHaveBeenCalled();
    });
  });

  describe('deleteTable', () => {
    it('should call deleteDoc on the table document', async () => {
      await deleteTable('comp-1', 'table-1');

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'tables',
        'table-1',
      );
      expect(mocks.mockDeleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'table-1' }));
    });
  });

  describe('addGameResult', () => {
    it('should call setDoc on the gameResults subcollection', async () => {
      const gameResult = {
        id: 'result-1',
        tableId: 'table-1',
        tableName: 'Table 1',
        gameIndex: 1,
        result: {} as any,
        participantIds: ['p1', 'p2'],
        timestamp: Date.now(),
      };

      await addGameResult('comp-1', gameResult);

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'gameResults',
        'result-1',
      );
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'result-1' }),
        gameResult,
      );
    });
  });

  describe('subscribeToGameResults', () => {
    it('should call onSnapshot on the gameResults subcollection and return list', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();

      mocks.mockOnSnapshot.mockImplementation((_ref: any, onNext: any) => {
        onNext({
          docs: [
            { data: () => ({ id: 'r1', tableId: 't1', gameIndex: 1 }) },
            { data: () => ({ id: 'r2', tableId: 't1', gameIndex: 2 }) },
          ],
        });
        return mockUnsubscribe;
      });

      const unsubscribe = subscribeToGameResults('comp-1', callback);

      expect(mocks.mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'gameResults',
      );
      expect(callback).toHaveBeenCalledWith([
        { id: 'r1', tableId: 't1', gameIndex: 1 },
        { id: 'r2', tableId: 't1', gameIndex: 2 },
      ]);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('getUserCompetitions', () => {
    it('should query competitions by organizerId and return list', async () => {
      mocks.mockGetDocs.mockResolvedValue({
        docs: [
          { data: () => ({ id: 'comp-1', name: 'Comp 1', organizerId: 'user-1' }) },
          { data: () => ({ id: 'comp-2', name: 'Comp 2', organizerId: 'user-1' }) },
        ],
      });

      const result = await getUserCompetitions('user-1');

      expect(mocks.mockCollection).toHaveBeenCalledWith(expect.anything(), 'competitions');
      expect(mocks.mockWhere).toHaveBeenCalledWith('organizerId', '==', 'user-1');
      expect(mocks.mockQuery).toHaveBeenCalled();
      expect(result).toEqual([
        { id: 'comp-1', name: 'Comp 1', organizerId: 'user-1' },
        { id: 'comp-2', name: 'Comp 2', organizerId: 'user-1' },
      ]);
    });
  });

  describe('verifyPasscode', () => {
    it('should return true when write-based verification succeeds', async () => {
      mocks.mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ id: 'comp-1', hasPasscode: true }),
      });
      mocks.mockHashPasscode.mockResolvedValue('abc123hashed');
      mocks.mockSetDoc.mockResolvedValue(undefined);

      const result = await verifyPasscode('comp-1', 'input-pass');

      expect(mocks.mockDoc).toHaveBeenCalledWith(expect.anything(), 'competitions', 'comp-1');
      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'verifications',
        'test-user-id',
      );
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'test-user-id' }),
        { hash: 'abc123hashed' },
      );
      expect(result).toBe(true);
    });

    it('should return false when write-based verification is denied', async () => {
      mocks.mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ id: 'comp-1', hasPasscode: true }),
      });
      mocks.mockHashPasscode.mockResolvedValue('wrong-hash');
      mocks.mockSetDoc.mockRejectedValue(new Error('PERMISSION_DENIED'));

      const result = await verifyPasscode('comp-1', 'wrong-pass');

      expect(result).toBe(false);
    });

    it('should return true when competition has no passcode', async () => {
      mocks.mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ id: 'comp-1', hasPasscode: false }),
      });

      const result = await verifyPasscode('comp-1', '');

      expect(result).toBe(true);
    });

    it('should return false when competition does not exist', async () => {
      mocks.mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await verifyPasscode('comp-nonexistent', 'pass');

      expect(result).toBe(false);
    });
  });

  describe('savePasscodeSecret', () => {
    it('should write passcode hash to secrets subcollection', async () => {
      mocks.mockSetDoc.mockResolvedValue(undefined);

      await savePasscodeSecret('comp-1', 'hashed-passcode');

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'secrets',
        'config',
      );
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'config' }), {
        passcodeHash: 'hashed-passcode',
      });
    });
  });

  describe('appointCoOrganizer', () => {
    it('should atomically add userId to coOrganizerIds and update participant role', async () => {
      await appointCoOrganizer('comp-1', 'participant-1', 'user-1');

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'comp-1' }),
        expect.objectContaining({ coOrganizerIds: { _arrayUnion: ['user-1'] } }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'participant-1' }),
        expect.objectContaining({ role: 'co_organizer' }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('removeCoOrganizer', () => {
    it('should atomically remove userId from coOrganizerIds and reset participant role', async () => {
      await removeCoOrganizer('comp-1', 'participant-1', 'user-1');

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'comp-1' }),
        expect.objectContaining({ coOrganizerIds: { _arrayRemove: ['user-1'] } }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'participant-1' }),
        expect.objectContaining({ role: 'player' }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('addGuestParticipant', () => {
    it('should generate an id and add participant with isGuest true', async () => {
      await addGuestParticipant('comp-1', 'Guest Player');

      expect(mocks.mockGenerateId).toHaveBeenCalled();
      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'participants',
        'generated-id',
      );
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'generated-id' }),
        expect.objectContaining({
          id: 'generated-id',
          name: 'Guest Player',
          isGuest: true,
          role: 'player',
          status: 'idle',
          joinedAt: 'SERVER_TIMESTAMP',
        }),
      );
    });
  });

  describe('assignPlayerToTable', () => {
    it('should batch-update table and participant when assigning', async () => {
      const table = {
        id: 'table-1',
        name: 'Table 1',
        mode: '4ma' as const,
        status: 'open' as const,
        playerIds: ['p1', 'p2'],
        gameCount: 0,
        createdAt: 0,
      };

      await assignPlayerToTable('comp-1', 'table-1', table, 'p3');

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      // table update with new playerIds, status, seatAssignment
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({
          playerIds: ['p1', 'p2', 'p3'],
          status: 'open',
          seatAssignment: { p1: 'East', p2: 'South', p3: 'West' },
        }),
      );
      // participant update
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p3' }),
        expect.objectContaining({ status: 'assigned', currentTableId: 'table-1' }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });

    it('should set status to ready when table reaches capacity', async () => {
      const table = {
        id: 'table-1',
        name: 'Table 1',
        mode: '4ma' as const,
        status: 'open' as const,
        playerIds: ['p1', 'p2', 'p3'],
        gameCount: 0,
        createdAt: 0,
      };

      await assignPlayerToTable('comp-1', 'table-1', table, 'p4');

      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({
          playerIds: ['p1', 'p2', 'p3', 'p4'],
          status: 'ready',
        }),
      );
    });
  });

  describe('assignPlayersToTable', () => {
    it('should batch-assign multiple players to an empty table', async () => {
      const table = {
        id: 'table-1',
        name: 'Table 1',
        mode: '4ma' as const,
        status: 'open' as const,
        playerIds: [] as string[],
        gameCount: 0,
        createdAt: 0,
      };

      await assignPlayersToTable('comp-1', 'table-1', table, ['p1', 'p2']);

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({
          playerIds: ['p1', 'p2'],
          status: 'open',
          seatAssignment: { p1: 'East', p2: 'South' },
        }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        expect.objectContaining({ status: 'assigned', currentTableId: 'table-1' }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p2' }),
        expect.objectContaining({ status: 'assigned', currentTableId: 'table-1' }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });

    it('should set status to ready when table reaches capacity after adding', async () => {
      const table = {
        id: 'table-1',
        name: 'Table 1',
        mode: '4ma' as const,
        status: 'open' as const,
        playerIds: ['p1', 'p2'],
        gameCount: 0,
        createdAt: 0,
      };

      await assignPlayersToTable('comp-1', 'table-1', table, ['p3', 'p4']);

      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({
          playerIds: ['p1', 'p2', 'p3', 'p4'],
          status: 'ready',
          seatAssignment: { p1: 'East', p2: 'South', p3: 'West', p4: 'North' },
        }),
      );
    });

    it('should do nothing when empty array is passed', async () => {
      const table = {
        id: 'table-1',
        name: 'Table 1',
        mode: '4ma' as const,
        status: 'open' as const,
        playerIds: ['p1'],
        gameCount: 0,
        createdAt: 0,
      };

      await assignPlayersToTable('comp-1', 'table-1', table, []);

      expect(mocks.mockWriteBatch).not.toHaveBeenCalled();
    });

    it('should throw error when exceeding table capacity', async () => {
      const table = {
        id: 'table-1',
        name: 'Table 1',
        mode: '4ma' as const,
        status: 'open' as const,
        playerIds: ['p1', 'p2', 'p3'],
        gameCount: 0,
        createdAt: 0,
      };

      await expect(assignPlayersToTable('comp-1', 'table-1', table, ['p4', 'p5'])).rejects.toThrow(
        'Cannot assign: exceeds table capacity',
      );

      expect(mocks.mockWriteBatch).not.toHaveBeenCalled();
    });
  });

  describe('unassignPlayerFromTable', () => {
    it('should batch-update table and participant when unassigning', async () => {
      const table = {
        id: 'table-1',
        name: 'Table 1',
        mode: '4ma' as const,
        status: 'ready' as const,
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        seatAssignment: {
          p1: 'East' as const,
          p2: 'South' as const,
          p3: 'West' as const,
          p4: 'North' as const,
        },
        gameCount: 0,
        createdAt: 0,
      };

      await unassignPlayerFromTable('comp-1', 'table-1', table, 'p3');

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({
          playerIds: ['p1', 'p2', 'p4'],
          status: 'open',
          seatAssignment: { p1: 'East', p2: 'South', p4: 'North' },
        }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p3' }),
        expect.objectContaining({ status: 'idle', currentTableId: '' }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('deleteTableWithCleanup', () => {
    it('should delete table and reset all assigned players', async () => {
      await deleteTableWithCleanup('comp-1', 'table-1', ['p1', 'p2', 'p3']);

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      // Each player should be reset
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        expect.objectContaining({ status: 'idle', currentTableId: '' }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p2' }),
        expect.objectContaining({ status: 'idle', currentTableId: '' }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p3' }),
        expect.objectContaining({ status: 'idle', currentTableId: '' }),
      );
      // Table should be deleted
      expect(mocks.mockBatchDelete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });

    it('should delete table even with no players', async () => {
      await deleteTableWithCleanup('comp-1', 'table-1', []);

      expect(mocks.mockBatchDelete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
      );
      expect(mocks.mockBatchUpdate).not.toHaveBeenCalled();
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('startTableMatch', () => {
    it('should batch-update table status and participant statuses', async () => {
      await startTableMatch('comp-1', 'table-1', 'room-abc', ['p1', 'p2', 'p3', 'p4']);

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({ status: 'playing', currentRoomId: 'room-abc' }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        expect.objectContaining({ status: 'playing' }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p4' }),
        expect.objectContaining({ status: 'playing' }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });

    it('should handle empty playerIds array', async () => {
      await startTableMatch('comp-1', 'table-1', 'room-abc', []);

      expect(mocks.mockBatchUpdate).toHaveBeenCalledTimes(1); // only table update
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('saveCompetitionGameResult', () => {
    it('should delegate to addGameResult', async () => {
      const result = {
        id: 'result-1',
        tableId: 'table-1',
        tableName: 'Table 1',
        gameIndex: 0,
        result: {} as any,
        participantIds: ['p1', 'p2'],
        timestamp: Date.now(),
      };

      await saveCompetitionGameResult('comp-1', result);

      expect(mocks.mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'competitions',
        'comp-1',
        'gameResults',
        'result-1',
      );
      expect(mocks.mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'result-1' }),
        result,
      );
    });
  });

  describe('startNextTableMatch', () => {
    it('should batch-update table with new roomId and gameCount', async () => {
      await startNextTableMatch('comp-1', 'table-1', 'room-new', 2);

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({ currentRoomId: 'room-new', gameCount: 2 }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe('dissolveTable', () => {
    it('should reset table status and participant statuses', async () => {
      await dissolveTable('comp-1', 'table-1', ['p1', 'p2', 'p3', 'p4']);

      expect(mocks.mockWriteBatch).toHaveBeenCalled();
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'table-1' }),
        expect.objectContaining({ status: 'open', currentRoomId: '', gameCount: 0 }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
        expect.objectContaining({ status: 'idle' }),
      );
      expect(mocks.mockBatchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p4' }),
        expect.objectContaining({ status: 'idle' }),
      );
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });

    it('should handle empty playerIds array', async () => {
      await dissolveTable('comp-1', 'table-1', []);

      expect(mocks.mockBatchUpdate).toHaveBeenCalledTimes(1); // only table update
      expect(mocks.mockBatchCommit).toHaveBeenCalled();
    });
  });
});

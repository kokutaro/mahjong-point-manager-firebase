/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addGameResult,
  addParticipant,
  COMPETITION_COLLECTION,
  createCompetition,
  createTable,
  deleteTable,
  removeParticipant,
  subscribeToCompetition,
  subscribeToGameResults,
  subscribeToParticipants,
  subscribeToTables,
  updateCompetition,
  updateParticipant,
  updateTable,
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
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('./firebase', () => ({
  db: {},
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
    it('should call setDoc with correct arguments', async () => {
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
});

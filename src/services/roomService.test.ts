/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateRoomState } from './roomService';

const deleteFieldMarker = { __deleteField: true };

const mocks = vi.hoisted(() => ({
  mockDoc: vi.fn((_db: any, ...pathSegments: string[]) => ({
    id: pathSegments[pathSegments.length - 1],
    path: pathSegments.join('/'),
  })),
  mockUpdateDoc: vi.fn(),
  mockServerTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  mockDeleteField: vi.fn(() => deleteFieldMarker),
  mockArrayUnion: vi.fn((...args: any[]) => ({ _arrayUnion: args })),
  mockGetDoc: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockSetDoc: vi.fn(),
  mockCollection: vi.fn(),
  mockGetDocs: vi.fn(),
  mockQuery: vi.fn(),
  mockWhere: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  arrayUnion: mocks.mockArrayUnion,
  collection: mocks.mockCollection,
  deleteField: mocks.mockDeleteField,
  doc: mocks.mockDoc,
  getDoc: mocks.mockGetDoc,
  getDocs: mocks.mockGetDocs,
  onSnapshot: mocks.mockOnSnapshot,
  query: mocks.mockQuery,
  serverTimestamp: mocks.mockServerTimestamp,
  setDoc: mocks.mockSetDoc,
  updateDoc: mocks.mockUpdateDoc,
  where: mocks.mockWhere,
}));

vi.mock('./firebase', () => ({
  db: {},
}));

describe('roomService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('updateRoomState', () => {
    it('translates undefined top-level fields into deleteField updates', async () => {
      await updateRoomState('room-1', {
        status: 'playing',
        lastEvent: undefined,
      });

      expect(mocks.mockDeleteField).toHaveBeenCalledTimes(1);
      expect(mocks.mockUpdateDoc).toHaveBeenCalledWith(
        { id: 'room-1', path: 'rooms/room-1' },
        expect.objectContaining({
          status: 'playing',
          lastEvent: deleteFieldMarker,
          updatedAt: 'SERVER_TIMESTAMP',
        }),
      );
    });
  });
});

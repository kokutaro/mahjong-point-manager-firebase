/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteAnalysisEntry,
  findAnalysisEntryByHandLog,
  getAnalysisEntry,
  saveAnalysisEntry,
  subscribeAnalysisEntries,
  USER_ANALYSES_COLLECTION,
} from './analysisService';

const mocks = vi.hoisted(() => ({
  mockCollection: vi.fn((_db: any, ...pathSegments: string[]) => ({
    path: pathSegments.join('/'),
  })),
  mockDeleteDoc: vi.fn(),
  mockDoc: vi.fn((_db: any, ...pathSegments: string[]) => ({
    id: pathSegments[pathSegments.length - 1],
    path: pathSegments.join('/'),
  })),
  mockGetDoc: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockOrderBy: vi.fn((...args: any[]) => ({ _orderBy: args })),
  mockQuery: vi.fn((...args: any[]) => ({ _query: args })),
  mockServerTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  mockSetDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: mocks.mockCollection,
  deleteDoc: mocks.mockDeleteDoc,
  doc: mocks.mockDoc,
  getDoc: mocks.mockGetDoc,
  onSnapshot: mocks.mockOnSnapshot,
  orderBy: mocks.mockOrderBy,
  query: mocks.mockQuery,
  serverTimestamp: mocks.mockServerTimestamp,
  setDoc: mocks.mockSetDoc,
}));

vi.mock('./firebase', () => ({
  db: {},
}));

const createAnalysisEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-1',
  uid: 'user-1',
  source: {
    kind: 'competition',
    competitionId: 'competition-1',
    gameResultId: 'result-1',
    handLogId: 'hand-1',
  },
  context: {
    round: {
      wind: 'East',
      number: 1,
      honba: 0,
    },
    seatWind: 'East',
    roundWind: 'East',
    eventType: 'win',
    isDealer: true,
  },
  hand: {
    concealed: [],
    melds: [],
    wait: [],
  },
  dora: {
    doraIndicators: [],
    uraIndicators: [],
    kanDoraIndicators: [],
    kanUraIndicators: [],
    redFiveCount: 0,
  },
  yaku: {
    list: [],
    yakuman: [],
    ippatsu: false,
    riichi: 'none',
    special: null,
  },
  notes: '',
  createdAt: 1000,
  updatedAt: 2000,
  ...overrides,
});

describe('analysisService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses the userAnalyses collection root', () => {
    expect(USER_ANALYSES_COLLECTION).toBe('userAnalyses');
  });

  it('returns null when the requested analysis entry does not exist', async () => {
    mocks.mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    await expect(getAnalysisEntry('user-1', 'entry-1')).resolves.toBeNull();
  });

  it('saves an analysis entry with merge semantics and a server updatedAt timestamp', async () => {
    const entry = createAnalysisEntry();

    await saveAnalysisEntry('user-1', entry as any);

    expect(mocks.mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'userAnalyses',
      'user-1',
      'entries',
      'hand-1',
    );
    expect(mocks.mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hand-1' }),
      expect.objectContaining({
        ...entry,
        id: 'hand-1',
        uid: 'user-1',
        updatedAt: 'SERVER_TIMESTAMP',
      }),
      { merge: true },
    );
  });

  it('subscribes with updatedAt descending order', () => {
    const callback = vi.fn();
    const unsubscribe = vi.fn();
    const newerEntry = createAnalysisEntry({ id: 'entry-2', updatedAt: 3000 });
    const olderEntry = createAnalysisEntry({ id: 'entry-1', updatedAt: 2000 });

    mocks.mockOnSnapshot.mockImplementation((_queryRef: any, onNext: any) => {
      onNext({
        docs: [
          { id: 'entry-2', data: () => newerEntry },
          { id: 'entry-1', data: () => olderEntry },
        ],
      });
      return unsubscribe;
    });

    const result = subscribeAnalysisEntries('user-1', callback);

    expect(mocks.mockCollection).toHaveBeenCalledWith(
      expect.anything(),
      'userAnalyses',
      'user-1',
      'entries',
    );
    expect(mocks.mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(mocks.mockQuery).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith([newerEntry, olderEntry]);
    expect(result).toBe(unsubscribe);
  });

  it('finds an entry by hand log source fields', async () => {
    const matchingEntry = createAnalysisEntry();
    mocks.mockGetDoc.mockResolvedValue({
      id: 'hand-1',
      exists: () => true,
      data: () => ({
        ...matchingEntry,
        id: 'hand-1',
      }),
    });

    const result = await findAnalysisEntryByHandLog('user-1', matchingEntry.source as any);

    expect(mocks.mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      'userAnalyses',
      'user-1',
      'entries',
      'hand-1',
    );
    expect(result).toEqual({
      ...matchingEntry,
      id: 'hand-1',
    });
  });

  it('deletes an analysis entry document', async () => {
    await deleteAnalysisEntry('user-1', 'entry-1');

    expect(mocks.mockDeleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'entry-1',
        path: 'userAnalyses/user-1/entries/entry-1',
      }),
    );
  });
});

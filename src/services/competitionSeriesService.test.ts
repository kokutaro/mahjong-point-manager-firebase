/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompetitionSeriesMember } from '../types';
import {
  addSeriesMembersToCompetition,
  createCompetitionSeries,
  getCompetitionSeriesMemberByUserId,
  importCompetitionParticipantsToSeries,
  joinCompetitionSeries,
  linkCompetitionParticipantToSeriesMember,
  linkCompetitionToSeries,
} from './competitionSeriesService';

const mocks = vi.hoisted(() => ({
  setDoc: vi.fn(),
  doc: vi.fn((_db: any, ...segments: string[]) => ({
    id: segments[segments.length - 1],
    path: segments.join('/'),
  })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  writeBatch: vi.fn(),
  batchSet: vi.fn(),
  batchUpdate: vi.fn(),
  batchCommit: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  transactionUpdate: vi.fn(),
  transactionDelete: vi.fn(),
  deleteField: vi.fn(() => 'DELETE_FIELD'),
  generateId: vi.fn(() => 'generated-id'),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  deleteField: mocks.deleteField,
  doc: mocks.doc,
  getDocs: mocks.getDocs,
  limit: vi.fn((value: number) => ({ limit: value })),
  onSnapshot: vi.fn(),
  query: vi.fn((...args: unknown[]) => args),
  runTransaction: async (_db: any, callback: any) => {
    mocks.runTransaction();
    return callback({
      get: mocks.transactionGet,
      set: mocks.transactionSet,
      update: mocks.transactionUpdate,
      delete: mocks.transactionDelete,
    });
  },
  serverTimestamp: mocks.serverTimestamp,
  setDoc: mocks.setDoc,
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: () => {
    mocks.writeBatch();
    return { set: mocks.batchSet, update: mocks.batchUpdate, commit: mocks.batchCommit };
  },
}));

vi.mock('../utils/id', () => ({ generateId: mocks.generateId }));
vi.mock('./firebase', () => ({ db: {}, auth: { currentUser: { uid: 'organizer' } } }));

const makeMember = (id: string): CompetitionSeriesMember => ({
  id,
  name: id,
  active: true,
  joinedAt: 1,
});

describe('competitionSeriesService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a series with server-managed timestamps', async () => {
    await createCompetitionSeries({
      id: 'series-1',
      name: '年間リーグ',
      organizerId: 'organizer',
      coOrganizerIds: [],
    });

    expect(mocks.doc).toHaveBeenCalledWith(expect.anything(), 'competitionSeries', 'series-1');
    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'competitionSeries/series-1' }),
      expect.objectContaining({
        id: 'series-1',
        name: '年間リーグ',
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
      }),
    );
  });

  it('joins the current user to a series under an ownership-bound member id', async () => {
    await joinCompetitionSeries('series-1', '参加者名');

    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'competitionSeries/series-1/members/organizer' }),
      expect.objectContaining({
        id: 'organizer',
        userId: 'organizer',
        name: '参加者名',
        active: true,
        joinedAt: 'SERVER_TIMESTAMP',
      }),
    );
  });

  it('finds an existing series member by authenticated user id', async () => {
    mocks.getDocs.mockResolvedValue({
      empty: false,
      docs: [{ data: () => makeMember('member-existing') }],
    });

    await expect(getCompetitionSeriesMemberByUserId('series-1', 'organizer')).resolves.toEqual(
      makeMember('member-existing'),
    );
  });

  it('atomically links an owned competition to an unused round number', async () => {
    mocks.transactionGet
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ organizerId: 'organizer', coOrganizerIds: [] }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ organizerId: 'organizer' }),
      })
      .mockResolvedValueOnce({ exists: () => false });

    await linkCompetitionToSeries('series-1', 'competition-1', 2);

    expect(mocks.transactionSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'competitionSeries/series-1/rounds/2' }),
      expect.objectContaining({ competitionId: 'competition-1', roundNumber: 2 }),
    );
    expect(mocks.transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'competitions/competition-1' }),
      { seriesId: 'series-1', seriesRoundNumber: 2 },
    );
  });

  it('rejects a duplicate series round without writing', async () => {
    mocks.transactionGet
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ organizerId: 'organizer', coOrganizerIds: [] }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ organizerId: 'organizer' }),
      })
      .mockResolvedValueOnce({ exists: () => true });

    await expect(linkCompetitionToSeries('series-1', 'competition-1', 2)).rejects.toThrow(
      'この回番号はすでに使用されています',
    );
    expect(mocks.transactionSet).not.toHaveBeenCalled();
  });

  it('rejects linking a competition that is already assigned to the series', async () => {
    mocks.transactionGet
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ organizerId: 'organizer', coOrganizerIds: [] }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          organizerId: 'organizer',
          seriesId: 'series-1',
          seriesRoundNumber: 1,
        }),
      })
      .mockResolvedValueOnce({ exists: () => false });

    await expect(linkCompetitionToSeries('series-1', 'competition-1', 2)).rejects.toThrow(
      'この大会はすでにシリーズへ紐付いています',
    );
    expect(mocks.transactionSet).not.toHaveBeenCalled();
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });

  it('adds selected series members as independently identified competition participants', async () => {
    mocks.batchCommit.mockResolvedValue(undefined);

    await addSeriesMembersToCompetition('competition-1', [
      makeMember('member-a'),
      makeMember('member-b'),
    ]);

    expect(mocks.batchSet).toHaveBeenCalledTimes(2);
    expect(mocks.batchSet).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'competitions/competition-1/participants/member-a-generated-id',
      }),
      expect.objectContaining({
        id: 'member-a-generated-id',
        name: 'member-a',
        seriesMemberId: 'member-a',
      }),
    );
  });

  it('imports and maps all unlinked competition participants in one batch', async () => {
    mocks.batchCommit.mockResolvedValue(undefined);
    const participants = [
      {
        id: 'participant-1',
        name: '新参加者',
        isGuest: true,
        status: 'idle' as const,
        role: 'player' as const,
        joinedAt: 1,
      },
    ];

    const result = await importCompetitionParticipantsToSeries(
      'series-1',
      'competition-1',
      [],
      participants,
    );

    expect(mocks.batchSet).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'competitionSeries/series-1/members/generated-id',
      }),
      expect.objectContaining({ id: 'generated-id', name: '新参加者', active: true }),
    );
    expect(mocks.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'competitions/competition-1/participants/participant-1',
      }),
      { seriesMemberId: 'generated-id' },
    );
    expect(result).toEqual({ createdMemberCount: 1, mappedParticipantCount: 1 });
  });

  it('rejects mapping two participants in the same competition to one series member', async () => {
    mocks.transactionGet
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ seriesMemberId: undefined }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ seriesMemberId: 'member-a' }) });

    await expect(
      linkCompetitionParticipantToSeriesMember('competition-1', 'participant-1', 'member-a', [
        'participant-1',
        'participant-2',
      ]),
    ).rejects.toThrow('同じシリーズ参加者には複数の参加者を紐付けできません');
    expect(mocks.transactionUpdate).not.toHaveBeenCalled();
  });
});

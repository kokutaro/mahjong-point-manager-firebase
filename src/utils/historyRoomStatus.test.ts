import { describe, expect, it } from 'vitest';
import type { RoomState } from '../types';
import { canResumeRoomFromHistory, isReadOnlyFinishedCompetitionRoom } from './historyRoomStatus';

describe('isReadOnlyFinishedCompetitionRoom', () => {
  it.each<{
    room: Pick<RoomState, 'competitionId' | 'status'>;
    expected: boolean;
    name: string;
  }>([
    {
      name: 'playing competition room',
      room: { status: 'playing', competitionId: 'c-1' },
      expected: false,
    },
    { name: 'regular finished room', room: { status: 'finished' }, expected: false },
    {
      name: 'finished competition room',
      room: { status: 'finished', competitionId: 'competition-1' },
      expected: true,
    },
    {
      name: 'ended competition room',
      room: { status: 'ended', competitionId: 'competition-1' },
      expected: false,
    },
  ])('returns $expected for $name', ({ room, expected }) => {
    expect(isReadOnlyFinishedCompetitionRoom(room)).toBe(expected);
  });
});

describe('canResumeRoomFromHistory', () => {
  it.each<{
    room: Pick<RoomState, 'competitionId' | 'status'>;
    expected: boolean;
    name: string;
  }>([
    { name: 'waiting room', room: { status: 'waiting' }, expected: true },
    { name: 'playing room', room: { status: 'playing' }, expected: true },
    { name: 'regular finished room', room: { status: 'finished' }, expected: true },
    {
      name: 'competition finished room',
      room: { status: 'finished', competitionId: 'competition-1' },
      expected: false,
    },
    { name: 'ended room', room: { status: 'ended' }, expected: false },
  ])('returns $expected for $name', ({ room, expected }) => {
    expect(canResumeRoomFromHistory(room)).toBe(expected);
  });
});

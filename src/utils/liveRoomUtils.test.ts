import { describe, expect, it } from 'vitest';
import { diffRoomIds, extractRoomIds } from './liveRoomUtils';
import type { CompetitionTable } from '../types';

const makeTable = (overrides: Partial<CompetitionTable> = {}): CompetitionTable => ({
  id: 'table-1',
  name: 'A卓',
  mode: '4ma',
  status: 'playing',
  playerIds: [],
  gameCount: 1,
  createdAt: Date.now(),
  ...overrides,
});

describe('extractRoomIds', () => {
  it('returns empty array when no tables have currentRoomId', () => {
    const tables = [makeTable(), makeTable({ id: 't2' })];
    expect(extractRoomIds(tables)).toEqual([]);
  });

  it('extracts unique roomIds from tables', () => {
    const tables = [
      makeTable({ id: 't1', currentRoomId: 'room-b' }),
      makeTable({ id: 't2', currentRoomId: 'room-a' }),
    ];
    expect(extractRoomIds(tables)).toEqual(['room-a', 'room-b']);
  });

  it('deduplicates same roomId', () => {
    const tables = [
      makeTable({ id: 't1', currentRoomId: 'room-1' }),
      makeTable({ id: 't2', currentRoomId: 'room-1' }),
    ];
    expect(extractRoomIds(tables)).toEqual(['room-1']);
  });

  it('filters out tables without currentRoomId', () => {
    const tables = [
      makeTable({ id: 't1', currentRoomId: 'room-1' }),
      makeTable({ id: 't2', currentRoomId: undefined }),
      makeTable({ id: 't3', currentRoomId: 'room-2' }),
    ];
    expect(extractRoomIds(tables)).toEqual(['room-1', 'room-2']);
  });
});

describe('diffRoomIds', () => {
  it('returns all as added when prev is empty', () => {
    const result = diffRoomIds(new Set(), new Set(['a', 'b']));
    expect(result.added).toEqual(['a', 'b']);
    expect(result.removed).toEqual([]);
  });

  it('returns all as removed when next is empty', () => {
    const result = diffRoomIds(new Set(['a', 'b']), new Set());
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual(['a', 'b']);
  });

  it('detects added and removed', () => {
    const result = diffRoomIds(new Set(['a', 'b']), new Set(['b', 'c']));
    expect(result.added).toEqual(['c']);
    expect(result.removed).toEqual(['a']);
  });

  it('returns empty when sets are identical', () => {
    const result = diffRoomIds(new Set(['a', 'b']), new Set(['a', 'b']));
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});

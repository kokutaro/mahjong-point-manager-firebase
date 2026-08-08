// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoomState } from '../types';
import { createDefaultRoomSettings } from '../utils/roomDefaults';
import { useMatchGame } from './useMatchGame';

afterEach(() => {
  cleanup();
});

const createRoom = (): RoomState => ({
  id: 'ROOM01',
  hostId: 'p1',
  status: 'playing',
  round: {
    wind: 'South',
    number: 3,
    honba: 2,
    riichiSticks: 1,
  },
  players: [
    { id: 'p1', name: 'Alice', score: 100, isRiichi: true, wind: 'East', chip: 2 },
    { id: 'p2', name: 'Bob', score: 24900, isRiichi: false, wind: 'South', chip: -2 },
    { id: 'p3', name: 'Carol', score: 25000, isRiichi: false, wind: 'West', chip: 0 },
    { id: 'p4', name: 'Dave', score: 25000, isRiichi: false, wind: 'North', chip: 0 },
  ],
  playerIds: ['p1', 'p2', 'p3', 'p4'],
  settings: {
    ...createDefaultRoomSettings('4ma'),
    useTobi: true,
  },
  history: [],
  currentLogs: [],
  gameResults: [],
});

describe('useMatchGame handleAdjustment', () => {
  it('only transfers points and records history without advancing or ending the hand', async () => {
    const room = createRoom();
    const persistedUpdates: Partial<RoomState>[] = [];
    const updateState = vi.fn(async (updates: Partial<RoomState>) => {
      persistedUpdates.push(updates);
    });
    const { result } = renderHook(() => useMatchGame({ room, updateState }));

    await act(async () => {
      await result.current.handleAdjustment({
        payerId: 'p1',
        receiverIds: ['p2'],
        amount: 200,
        description: 'テスト移動',
      });
    });

    expect(updateState).toHaveBeenCalledTimes(1);
    const [updates] = persistedUpdates;

    expect(
      updates.players?.map(({ id, score, isRiichi, wind, chip }) => ({
        id,
        score,
        isRiichi,
        wind,
        chip,
      })),
    ).toEqual([
      { id: 'p1', score: -100, isRiichi: true, wind: 'East', chip: 2 },
      { id: 'p2', score: 25100, isRiichi: false, wind: 'South', chip: -2 },
      { id: 'p3', score: 25000, isRiichi: false, wind: 'West', chip: 0 },
      { id: 'p4', score: 25000, isRiichi: false, wind: 'North', chip: 0 },
    ]);
    expect(updates).not.toHaveProperty('round');
    expect(updates).not.toHaveProperty('status');
    expect(updates).not.toHaveProperty('gameResults');
    expect(updates.currentLogs?.at(-1)?.result).toMatchObject({
      type: 'Adjustment',
      description: 'テスト移動',
      scoreDeltas: { p1: -200, p2: 200 },
    });
    expect(updates.history).toHaveLength(1);
    expect(updates.history?.[0]).toMatchObject({
      status: 'playing',
      round: room.round,
      players: room.players,
    });
  });
});

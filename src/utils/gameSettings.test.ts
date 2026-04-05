import { describe, expect, it } from 'vitest';
import type { NoFuFixedPoints, RoomState } from '../types';
import {
  DEFAULT_NO_FU_FIXED_POINTS,
  normalizeGameSettings,
  normalizeRoomState,
  normalizeRoomStateUpdate,
  sanitizeFirestoreData,
} from './gameSettings';

const createBaseRoom = (): RoomState => ({
  id: 'room-1',
  hostId: 'host-1',
  status: 'waiting',
  roomName: 'test room',
  round: {
    wind: 'East',
    number: 1,
    honba: 0,
    riichiSticks: 0,
  },
  players: [
    {
      id: 'host-1',
      name: 'host',
      score: 25000,
      isRiichi: false,
      wind: 'East',
      chip: 0,
    },
  ],
  playerIds: ['host-1'],
  settings: {
    mode: '4ma',
    length: 'Hanchan',
    startPoint: 25000,
    returnPoint: 30000,
    uma: [5, 10],
    hasHonba: true,
    honbaPoints: 300,
    tenpaiRenchan: true,
    useTobi: true,
    useChip: false,
    chipRate: 0,
    useOka: true,
    isSingleMode: false,
    useFuCalculation: false,
    westExtension: false,
    rate: 50,
  },
});

describe('gameSettings normalization', () => {
  it('fills default no-fu fixed points when missing', () => {
    const settings = normalizeGameSettings(createBaseRoom().settings);

    expect(settings.noFuFixedPoints).toEqual(DEFAULT_NO_FU_FIXED_POINTS);
  });

  it('keeps custom values while filling only missing entries', () => {
    const partialNoFuFixedPoints = {
      1: { child: 1200, dealer: 1800 },
      2: { child: 2200, dealer: 3200 },
    } as Partial<NoFuFixedPoints> as NoFuFixedPoints;

    const settings = normalizeGameSettings({
      ...createBaseRoom().settings,
      noFuFixedPoints: partialNoFuFixedPoints,
    });

    expect(settings.noFuFixedPoints).toEqual({
      1: { child: 1200, dealer: 1800 },
      2: { child: 2200, dealer: 3200 },
      3: DEFAULT_NO_FU_FIXED_POINTS[3],
    });
  });

  it('rounds invalid fixed points to the nearest 100', () => {
    const settings = normalizeGameSettings({
      ...createBaseRoom().settings,
      noFuFixedPoints: {
        1: { child: 1150, dealer: 1549 },
        2: { child: 50, dealer: 3251 },
        3: { child: 4444, dealer: 0 },
      },
    });

    expect(settings.noFuFixedPoints).toEqual({
      1: { child: 1200, dealer: 1500 },
      2: { child: 100, dealer: 3300 },
      3: { child: 4400, dealer: DEFAULT_NO_FU_FIXED_POINTS[3].dealer },
    });
  });

  it('normalizes room settings and existing game result rule snapshots', () => {
    const room = createBaseRoom();
    const normalizedRoom = normalizeRoomState({
      ...room,
      gameResults: [
        {
          id: 'game-1',
          timestamp: Date.now(),
          ruleSnapshot: room.settings,
          scores: [],
        },
      ],
    });

    expect(normalizedRoom.settings.noFuFixedPoints).toEqual(DEFAULT_NO_FU_FIXED_POINTS);
    expect(normalizedRoom.gameResults?.[0].ruleSnapshot.noFuFixedPoints).toEqual(
      DEFAULT_NO_FU_FIXED_POINTS,
    );
  });

  it('omits untouched optional fields from room state updates', () => {
    const updates = normalizeRoomStateUpdate({
      status: 'playing',
    });

    expect(updates).toEqual({ status: 'playing' });
    expect('settings' in updates).toBe(false);
    expect('history' in updates).toBe(false);
    expect('gameResults' in updates).toBe(false);
  });

  it('removes undefined values deeply for firestore payloads', () => {
    const payload = sanitizeFirestoreData({
      status: 'playing',
      roomName: undefined,
      history: [
        {
          id: 'room-1',
          status: 'waiting',
          settings: undefined,
          gameResults: undefined,
          nested: {
            value: 1,
            optional: undefined,
          },
        },
      ],
    });

    expect(payload).toEqual({
      status: 'playing',
      history: [
        {
          id: 'room-1',
          status: 'waiting',
          nested: {
            value: 1,
          },
        },
      ],
    });
  });
});

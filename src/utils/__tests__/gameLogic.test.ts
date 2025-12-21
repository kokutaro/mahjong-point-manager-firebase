import { describe, expect, it } from 'vitest';
import type { RoomState } from '../../types';
import type { HandResult } from '../gameLogic';
import { processHandEnd } from '../gameLogic';

// Helper to create mock state
const createMockState = (
  wind: 'East' | 'South' = 'East',
  number: number = 1,
  honba: number = 0,
  riichiSticks: number = 0,
  dealerId: string = 'p1'
): RoomState => {
  return {
    id: 'test',
    hostId: 'p1',
    status: 'playing',
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
      useOka: true,
      useFuCalculation: true,
      westExtension: false
    },
    round: { wind, number, honba, riichiSticks },
    players: [
      { id: 'p1', name: 'A', score: 25000, isRiichi: false, wind: dealerId === 'p1' ? 'East' : 'South', chip: 0 },
      { id: 'p2', name: 'B', score: 25000, isRiichi: false, wind: dealerId === 'p2' ? 'East' : 'South', chip: 0 },
      { id: 'p3', name: 'C', score: 25000, isRiichi: false, wind: dealerId === 'p3' ? 'East' : 'West', chip: 0 },
      { id: 'p4', name: 'D', score: 25000, isRiichi: false, wind: dealerId === 'p4' ? 'East' : 'North', chip: 0 },
    ],
    playerIds: ['p1', 'p2', 'p3', 'p4']
  };
};

describe('Game Logic - Dealer Rotation & Honba', () => {

  it('should continue dealer (Renchan) and increment honba when Dealer wins', () => {
    const state = createMockState('East', 1, 0, 0, 'p1');
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', ron: 12000, basePoints: 4000 } }]
    };

    const next = processHandEnd(state, result);

    expect(next.nextRound.number).toBe(1);
    expect(next.nextRound.wind).toBe('East');
    expect(next.nextRound.honba).toBe(1);
  });

  it('should increment honba even if settings are missing (backward compatibility)', () => {
    const state = createMockState('East', 1, 0, 0, 'p1');
    // Force settings to be empty/undefined to simulate old data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state as any).settings = {};

    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', ron: 12000, basePoints: 4000 } }]
    };

    const next = processHandEnd(state, result);
    // Ideally this should still be 1 if we default to true
    expect(next.nextRound.honba).toBe(1);
  });

  it('should rotate dealer and reset honba when Child wins', () => {
    const state = createMockState('East', 1, 1, 0, 'p1'); // 1 Honba exists
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p2', payment: { name: 'Mangan', ron: 8000, basePoints: 2000 } }]
    };

    const next = processHandEnd(state, result);

    expect(next.nextRound.number).toBe(2); // Next round
    expect(next.nextRound.wind).toBe('East');
    expect(next.nextRound.honba).toBe(0); // Reset
  });

  it('should rotate dealer BUT increment honba when Ryukyoku (Dealer Noten)', () => {
    const state = createMockState('East', 1, 0, 0, 'p1');
    const result: HandResult = {
      type: 'Draw',
      tenpaiPlayerIds: ['p2', 'p3'] // Dealer p1 is Noten
    };

    const next = processHandEnd(state, result);

    expect(next.nextRound.number).toBe(2); // Rotate
    expect(next.nextRound.honba).toBe(1); // Increment (Not reset!)
  });

  it('should continue dealer and increment honba when Ryukyoku (Dealer Tenpai)', () => {
    const state = createMockState('East', 1, 2, 0, 'p1');
    const result: HandResult = {
      type: 'Draw',
      tenpaiPlayerIds: ['p1'] // Dealer Tenpai
    };

    const next = processHandEnd(state, result);

    expect(next.nextRound.number).toBe(1); // Renchan
    expect(next.nextRound.honba).toBe(3); // Increment
  });

  it('should enter South round after East 4 ends', () => {
    // p4 is dealer (North/East 4)
    const state = createMockState('East', 4, 0, 0, 'p4');
    // Set p4 wind correctly relative
    // Skip full wind logic mock, assuming p4 is dealer

    // Child (p1) wins
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan' } as any }] // eslint-disable-line @typescript-eslint/no-explicit-any
    };

    const next = processHandEnd(state, result);

    expect(next.nextRound.wind).toBe('South');
    expect(next.nextRound.number).toBe(1);
  });
});

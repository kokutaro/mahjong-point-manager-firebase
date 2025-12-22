import { describe, expect, it } from 'vitest';
import type { RoomState } from '../../types';
import type { HandResult } from '../gameLogic';
import { processHandEnd } from '../gameLogic';

// Helper to create mock state
const createMockState = (
  wind: 'East' | 'South' | 'West' | 'North' = 'East',
  number: number = 1,
  honba: number = 0,
  riichiSticks: number = 0,
  dealerId: string = 'p1',
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
      westExtension: false,
      rate: 50,
    },
    round: { wind, number, honba, riichiSticks },
    players: [
      {
        id: 'p1',
        name: 'A',
        score: 25000,
        isRiichi: false,
        wind: dealerId === 'p1' ? 'East' : 'South',
        chip: 0,
      },
      {
        id: 'p2',
        name: 'B',
        score: 25000,
        isRiichi: false,
        wind: dealerId === 'p2' ? 'East' : 'South',
        chip: 0,
      },
      {
        id: 'p3',
        name: 'C',
        score: 25000,
        isRiichi: false,
        wind: dealerId === 'p3' ? 'East' : 'West',
        chip: 0,
      },
      {
        id: 'p4',
        name: 'D',
        score: 25000,
        isRiichi: false,
        wind: dealerId === 'p4' ? 'East' : 'North',
        chip: 0,
      },
    ],
    playerIds: ['p1', 'p2', 'p3', 'p4'],
  };
};

describe('Game Logic - Dealer Rotation & Honba', () => {
  it('should continue dealer (Renchan) and increment honba when Dealer wins', () => {
    const state = createMockState('East', 1, 0, 0, 'p1');
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', ron: 12000, basePoints: 4000 } }],
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
      winners: [{ id: 'p1', payment: { name: 'Mangan', ron: 12000, basePoints: 4000 } }],
    };

    const next = processHandEnd(state, result);
    // Ideally this should still be 1 if we default to true
    expect(next.nextRound.honba).toBe(1);
  });

  it('should rotate dealer and reset honba when Child wins', () => {
    const state = createMockState('East', 1, 1, 0, 'p1'); // 1 Honba exists
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p2', payment: { name: 'Mangan', ron: 8000, basePoints: 2000 } }],
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
      tenpaiPlayerIds: ['p2', 'p3'], // Dealer p1 is Noten
    };

    const next = processHandEnd(state, result);

    expect(next.nextRound.number).toBe(2); // Rotate
    expect(next.nextRound.honba).toBe(1); // Increment (Not reset!)
  });

  it('should continue dealer and increment honba when Ryukyoku (Dealer Tenpai)', () => {
    const state = createMockState('East', 1, 2, 0, 'p1');
    const result: HandResult = {
      type: 'Draw',
      tenpaiPlayerIds: ['p1'], // Dealer Tenpai
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
      winners: [{ id: 'p1', payment: { name: 'Mangan', basePoints: 8000 } }],
    };

    const next = processHandEnd(state, result);

    expect(next.nextRound.wind).toBe('South');
    expect(next.nextRound.number).toBe(1);
  });
});

describe('Game Logic - Agari Yame', () => {
  it('should End Game when Dealer is Top and Score >= ReturnPoint in All Last (South 4) with Renchan', () => {
    // Setup South 4 (All Last)
    const state = createMockState('South', 4, 0, 0, 'p4'); // p4 is dealer
    // Set scores: Dealer (p4) is Top (40000), others lower
    state.players[0].score = 20000;
    state.players[1].score = 20000;
    state.players[2].score = 20000;
    state.players[3].score = 40000; // Dealer p4

    // Result: Dealer Win (Renchan)
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p4', payment: { name: 'Mangan', basePoints: 12000 } }],
    };

    const next = processHandEnd(state, result);

    expect(next.isGameOver).toBe(true);
    expect(next.gameEndReason).toBe('ScoreReached');
    // Also verify next round state if game wasn't over? (It is over, so nextRound might be irrelevant or same)
    // But check that it correctly detected Renchan logic internally
    expect(next.nextRound.honba).toBe(1);
  });
});

describe('Game Logic - Game End & Extension', () => {
  it('should End Game naturally if South 4 ends and someone reached ReturnPoint', () => {
    const state = createMockState('South', 4, 0, 0, 'p4');
    state.players[0].score = 35000; // > 30000
    state.players[1].score = 25000;
    state.players[2].score = 20000;
    state.players[3].score = 20000; // Dealer

    // Result: Child Win (No Renchan) implies moving to next field/Game End
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', basePoints: 8000 } }],
    };

    const next = processHandEnd(state, result);
    expect(next.isGameOver).toBe(true);
    expect(next.gameEndReason).toBe('MaxRoundReached');
  });

  it('should Enter West Extension if South 4 ends and NO ONE reached ReturnPoint (Extension ON)', () => {
    const state = createMockState('South', 4, 0, 0, 'p4');
    // Everyone < 30000
    state.players[0].score = 29000;
    state.players[1].score = 29000;
    state.players[2].score = 21000;
    state.players[3].score = 21000;
    state.settings.returnPoint = 30000;
    state.settings.westExtension = true; // ON

    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', basePoints: 8000 } }],
    };

    const next = processHandEnd(state, result);

    expect(next.isGameOver).toBe(false);
    expect(next.nextRound.wind).toBe('West');
    expect(next.nextRound.number).toBe(1);
  });

  it('should End Game if South 4 ends and NO ONE reached ReturnPoint (Extension OFF)', () => {
    const state = createMockState('South', 4, 0, 0, 'p4');
    // Everyone < 30000
    state.players[0].score = 29000;
    state.players[1].score = 29000;
    state.players[2].score = 21000;
    state.players[3].score = 21000;
    state.settings.returnPoint = 30000;
    state.settings.westExtension = false; // OFF

    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', basePoints: 8000 } }],
    };

    const next = processHandEnd(state, result);

    expect(next.isGameOver).toBe(true);
    expect(next.gameEndReason).toBe('MaxRoundReached');
  });
});

describe('Game Logic - Bankruptcy (Tobi)', () => {
  it('should End Game if a player score drops below 0', () => {
    const state = createMockState('East', 1, 0, 0, 'p1');
    state.players[1].score = -100; // Negative Score
    state.settings.useTobi = true;

    // Any result triggering check
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', basePoints: 8000 } }],
    };

    const next = processHandEnd(state, result);
    expect(next.isGameOver).toBe(true);
    expect(next.gameEndReason).toBe('Bankruptcy');
  });
});

describe('Game Logic - Round Loop', () => {
  it('should increment cycle count when wind loops back to East (North 4 -> East 1)', () => {
    // Setup North 4
    // Note: createMockState defaults wind to East/South type, cast to any for North/West testing if strictly typed
    const state = createMockState('North', 4, 0, 0, 'p4');
    state.round.count = 1;

    // Child Win (Rotate)
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', basePoints: 8000 } }],
    };

    const next = processHandEnd(state, result);

    expect(next.nextRound.wind).toBe('East');
    expect(next.nextRound.number).toBe(1);
    expect(next.nextRound.count).toBe(2);
  });
});

describe('Game Logic - Honba Disable', () => {
  it('should NOT increment Honba if hasHonba is false', () => {
    const state = createMockState('East', 1, 0, 0, 'p1');
    state.settings.hasHonba = false;

    // Dealer Win (Normally Renchan + Honba Up)
    const result: HandResult = {
      type: 'Win',
      winners: [{ id: 'p1', payment: { name: 'Mangan', basePoints: 8000 } }],
    };

    const next = processHandEnd(state, result);
    expect(next.nextRound.number).toBe(1); // Renchan
    expect(next.nextRound.honba).toBe(0); // No Honba
  });
});

describe('Game Logic - Agari Renchan (Tenpai Renchan OFF)', () => {
  it('should rotate Dealer even on Tenpai if Tenpai Renchan is OFF', () => {
    const state = createMockState('East', 1, 0, 0, 'p1');
    state.settings.tenpaiRenchan = false;

    // Draw, Dealer Tenpai
    const result: HandResult = {
      type: 'Draw',
      tenpaiPlayerIds: ['p1'],
    };

    const next = processHandEnd(state, result);
    expect(next.nextRound.number).toBe(2); // Rotate!
    expect(next.nextRound.honba).toBe(1); // Honba still increments
  });
});

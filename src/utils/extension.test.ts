import { describe, expect, it } from 'vitest';
import type { GameSettings, Player, RoomState } from '../types';
import { processHandEnd, type HandResult } from './gameLogic';

describe('West Extension Logic', () => {
  const defaultSettings: GameSettings = {
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
    isSingleMode: false,
  };

  const createPlayers = (scores: number[]): Player[] => {
    const winds: ('East' | 'South' | 'West' | 'North')[] = ['East', 'South', 'West', 'North'];
    return scores.map((s, i) => ({
      id: `p${i}`,
      name: `Player${i}`,
      score: s,
      wind: winds[i],
      isRiichi: false,
      chip: 0,
    }));
  };

  const createRoom = (
    roundWind: 'South' | 'West' | 'North' | 'East',
    roundNum: number,
    scores: number[],
    westExt: boolean,
    count: number = 1,
  ): RoomState => ({
    id: 'test',
    hostId: 'p0',
    status: 'playing',
    round: { wind: roundWind, number: roundNum, honba: 0, riichiSticks: 0, count: count },
    players: createPlayers(scores),
    playerIds: ['p0', 'p1', 'p2', 'p3'],
    settings: { ...defaultSettings, westExtension: westExt },
  });

  const dummyResult: HandResult = { type: 'Draw', tenpaiPlayerIds: [] }; // No one Tenpai -> Dealer rotates

  it('Standard Game Over at South 4 if West Ext is OFF', () => {
    const room = createRoom('South', 4, [25000, 25000, 25000, 25000], false);
    const next = processHandEnd(room, dummyResult);
    expect(next.isGameOver).toBe(true);
    expect(next.gameEndReason).toBe('MaxRoundReached');
  });

  it('Enters West 1 if West Ext is ON and no one >= Return', () => {
    const room = createRoom('South', 4, [25000, 25000, 25000, 25000], true);
    const next = processHandEnd(room, dummyResult);
    expect(next.isGameOver).toBe(false);
    expect(next.nextRound.wind).toBe('West');
    expect(next.nextRound.number).toBe(1);
  });

  it('Ends Game at South 4 if West Ext is ON but someone >= Return', () => {
    const room = createRoom('South', 4, [30000, 24000, 23000, 23000], true);
    const next = processHandEnd(room, dummyResult);
    expect(next.isGameOver).toBe(true);
  });

  it('Enters North 1 if West Ext is ON and still no one >= Return at West 4', () => {
    const room = createRoom('West', 4, [25000, 25000, 25000, 25000], true);
    const next = processHandEnd(room, dummyResult);
    expect(next.isGameOver).toBe(false);
    expect(next.nextRound.wind).toBe('North');
    expect(next.nextRound.number).toBe(1);
  });

  it('Returns to East 1 (Round Count 2) if West Ext is ON and still no one >= Return at North 4', () => {
    const room = createRoom('North', 4, [25000, 25000, 25000, 25000], true);
    const next = processHandEnd(room, dummyResult);
    expect(next.isGameOver).toBe(false);
    expect(next.nextRound.wind).toBe('East');
    expect(next.nextRound.number).toBe(1);
    expect(next.nextRound.count).toBe(2);
  });

  it('Continues at End of Return East 4 if no one >= Return', () => {
    // Count = 2. End of East 4.
    const room = createRoom('East', 4, [25000, 25000, 25000, 25000], true, 2);
    const next = processHandEnd(room, dummyResult);
    expect(next.isGameOver).toBe(false);
    expect(next.nextRound.wind).toBe('South');
    expect(next.nextRound.count).toBe(2);
  });

  it('Ends Game at Return East 4 if someone >= Return', () => {
    // Count = 2. End of East 4.
    const room = createRoom('East', 4, [31000, 24000, 23000, 22000], true, 2);
    const next = processHandEnd(room, dummyResult);
    expect(next.isGameOver).toBe(true);
  });
});

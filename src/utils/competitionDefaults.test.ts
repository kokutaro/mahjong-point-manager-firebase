import { describe, expect, it } from 'vitest';
import type { CompetitionParticipant, CompetitionSettings, SeatAssignment } from '../types';
import { DEFAULT_NO_FU_FIXED_POINTS } from './gameSettings';
import {
  buildGameSettingsFromCompetition,
  buildPlayersFromParticipants,
  DEFAULT_COMPETITION_SETTINGS,
} from './competitionDefaults';

describe('DEFAULT_COMPETITION_SETTINGS', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_COMPETITION_SETTINGS).toEqual<CompetitionSettings>({
      length: 'Hanchan',
      startPoint4ma: 25000,
      startPoint3ma: 35000,
      returnPoint4ma: 30000,
      returnPoint3ma: 40000,
      uma: [10, 30],
      hasHonba: true,
      honbaPoints: 300,
      tenpaiRenchan: true,
      useTobi: true,
      useChip: false,
      chipRate: 0,
      useOka: true,
      useFuCalculation: true,
      noFuFixedPoints: DEFAULT_NO_FU_FIXED_POINTS,
      westExtension: false,
      rate: 0,
    });
  });

  it('should include chipRate field with default 0', () => {
    expect(DEFAULT_COMPETITION_SETTINGS.chipRate).toBe(0);
  });

  it('should include noFuFixedPoints with default values', () => {
    expect(DEFAULT_COMPETITION_SETTINGS.noFuFixedPoints).toEqual({
      1: { child: 1000, dealer: 1500 },
      2: { child: 2000, dealer: 3000 },
      3: { child: 4000, dealer: 6000 },
    });
  });

  it('should have its own copy of noFuFixedPoints (not shared reference)', () => {
    expect(DEFAULT_COMPETITION_SETTINGS.noFuFixedPoints).not.toBe(DEFAULT_NO_FU_FIXED_POINTS);
  });
});

describe('buildGameSettingsFromCompetition', () => {
  const settings: CompetitionSettings = {
    length: 'Hanchan',
    startPoint4ma: 25000,
    startPoint3ma: 35000,
    returnPoint4ma: 30000,
    returnPoint3ma: 40000,
    uma: [10, 30],
    hasHonba: true,
    honbaPoints: 300,
    tenpaiRenchan: true,
    useTobi: true,
    useChip: false,
    chipRate: 0,
    useOka: true,
    useFuCalculation: true,
    noFuFixedPoints: {
      1: { child: 1000, dealer: 1500 },
      2: { child: 2000, dealer: 3000 },
      3: { child: 4000, dealer: 6000 },
    },
    westExtension: false,
    rate: 0,
  };

  it('should return correct GameSettings for 4ma mode', () => {
    const result = buildGameSettingsFromCompetition(settings, '4ma');

    expect(result.mode).toBe('4ma');
    expect(result.isSingleMode).toBe(false);
    expect(result.startPoint).toBe(25000);
    expect(result.returnPoint).toBe(30000);
    expect(result.length).toBe('Hanchan');
    expect(result.uma).toEqual([10, 30]);
    expect(result.hasHonba).toBe(true);
    expect(result.honbaPoints).toBe(300);
  });

  it('should return correct GameSettings for 3ma mode', () => {
    const result = buildGameSettingsFromCompetition(settings, '3ma');

    expect(result.mode).toBe('3ma');
    expect(result.isSingleMode).toBe(false);
    expect(result.startPoint).toBe(35000);
    expect(result.returnPoint).toBe(40000);
    expect(result.length).toBe('Hanchan');
    expect(result.uma).toEqual([10, 30]);
  });

  it('should propagate chipRate when useChip is true', () => {
    const chipSettings: CompetitionSettings = {
      ...settings,
      useChip: true,
      chipRate: 100,
    };
    const result = buildGameSettingsFromCompetition(chipSettings, '4ma');

    expect(result.useChip).toBe(true);
    expect(result.chipRate).toBe(100);
  });

  it('should propagate noFuFixedPoints when useFuCalculation is false', () => {
    const customNoFu: CompetitionSettings = {
      ...settings,
      useFuCalculation: false,
      noFuFixedPoints: {
        1: { child: 1500, dealer: 2000 },
        2: { child: 3000, dealer: 4000 },
        3: { child: 6000, dealer: 8000 },
      },
    };
    const result = buildGameSettingsFromCompetition(customNoFu, '3ma');

    expect(result.useFuCalculation).toBe(false);
    expect(result.noFuFixedPoints).toEqual({
      1: { child: 1500, dealer: 2000 },
      2: { child: 3000, dealer: 4000 },
      3: { child: 6000, dealer: 8000 },
    });
  });
});

describe('buildPlayersFromParticipants', () => {
  const makeParticipant = (id: string, name: string, userId?: string): CompetitionParticipant => ({
    id,
    userId,
    name,
    isGuest: !userId,
    status: 'assigned',
    role: 'player',
    joinedAt: Date.now(),
  });

  it('should create Player[] from participants with correct seat assignment', () => {
    const participants = [
      makeParticipant('p1', 'Alice', 'uid-1'),
      makeParticipant('p2', 'Bob', 'uid-2'),
      makeParticipant('p3', 'Charlie', 'uid-3'),
      makeParticipant('p4', 'Dave', 'uid-4'),
    ];
    const seatAssignment: SeatAssignment = {
      p1: 'East',
      p2: 'South',
      p3: 'West',
      p4: 'North',
    };

    const result = buildPlayersFromParticipants(participants, seatAssignment, 25000);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      id: 'uid-1',
      name: 'Alice',
      score: 25000,
      isRiichi: false,
      wind: 'East',
      chip: 0,
    });
    expect(result[1]).toEqual({
      id: 'uid-2',
      name: 'Bob',
      score: 25000,
      isRiichi: false,
      wind: 'South',
      chip: 0,
    });
  });

  it('should use participant id when userId is undefined (guest players)', () => {
    const participants = [makeParticipant('guest-1', 'Guest')];
    const seatAssignment: SeatAssignment = { 'guest-1': 'East' };

    const result = buildPlayersFromParticipants(participants, seatAssignment, 35000);

    expect(result[0].id).toBe('guest-1');
    expect(result[0].score).toBe(35000);
  });

  it('should default wind to East when seat assignment is missing', () => {
    const participants = [makeParticipant('p1', 'Alice', 'uid-1')];
    const seatAssignment: SeatAssignment = {};

    const result = buildPlayersFromParticipants(participants, seatAssignment, 25000);

    expect(result[0].wind).toBe('East');
  });

  it('should handle 3-player (3ma) setup', () => {
    const participants = [
      makeParticipant('p1', 'A', 'u1'),
      makeParticipant('p2', 'B', 'u2'),
      makeParticipant('p3', 'C', 'u3'),
    ];
    const seatAssignment: SeatAssignment = {
      p1: 'East',
      p2: 'South',
      p3: 'West',
    };

    const result = buildPlayersFromParticipants(participants, seatAssignment, 35000);

    expect(result).toHaveLength(3);
    result.forEach((p) => {
      expect(p.score).toBe(35000);
      expect(p.isRiichi).toBe(false);
      expect(p.chip).toBe(0);
    });
  });
});

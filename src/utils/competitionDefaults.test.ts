import { describe, expect, it } from 'vitest';
import type { CompetitionSettings } from '../types';
import { DEFAULT_NO_FU_FIXED_POINTS } from './gameSettings';
import {
  buildGameSettingsFromCompetition,
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

import { describe, expect, it } from 'vitest';
import type { CompetitionSettings } from '../types';
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
      useOka: true,
      useFuCalculation: true,
      westExtension: false,
      rate: 0,
    });
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
    useOka: true,
    useFuCalculation: true,
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
});

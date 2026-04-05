import type { CompetitionSettings, GameSettings } from '../types';
import { cloneNoFuFixedPoints } from './gameSettings';

export const DEFAULT_COMPETITION_SETTINGS: CompetitionSettings = {
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
  noFuFixedPoints: cloneNoFuFixedPoints(),
  westExtension: false,
  rate: 0,
};

export const buildGameSettingsFromCompetition = (
  settings: CompetitionSettings,
  mode: '3ma' | '4ma',
): GameSettings => {
  const { startPoint4ma, startPoint3ma, returnPoint4ma, returnPoint3ma, ...rest } = settings;
  return {
    ...rest,
    mode,
    isSingleMode: false,
    startPoint: mode === '4ma' ? startPoint4ma : startPoint3ma,
    returnPoint: mode === '4ma' ? returnPoint4ma : returnPoint3ma,
  };
};

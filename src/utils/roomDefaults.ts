import type { GameSettings } from '../types';
import { cloneNoFuFixedPoints, normalizeGameSettings } from './gameSettings';

const BASE_ROOM_SETTINGS_4MA: GameSettings = {
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
  useFuCalculation: true,
  noFuFixedPoints: cloneNoFuFixedPoints(),
  yakitoriEnabled: false,
  yakitoriPoint: 10,
  westExtension: false,
  rate: 50,
};

const BASE_ROOM_SETTINGS_3MA: GameSettings = {
  mode: '3ma',
  length: 'Hanchan',
  startPoint: 35000,
  returnPoint: 40000,
  uma: [10, 20],
  hasHonba: true,
  honbaPoints: 1500,
  tenpaiRenchan: true,
  useTobi: true,
  useChip: false,
  chipRate: 0,
  useOka: true,
  isSingleMode: false,
  useFuCalculation: true,
  noFuFixedPoints: cloneNoFuFixedPoints(),
  yakitoriEnabled: false,
  yakitoriPoint: 10,
  westExtension: false,
  rate: 50,
};

export const createDefaultRoomSettings = (mode: '4ma' | '3ma' = '4ma'): GameSettings => {
  const baseSettings = mode === '3ma' ? BASE_ROOM_SETTINGS_3MA : BASE_ROOM_SETTINGS_4MA;

  return {
    ...baseSettings,
    noFuFixedPoints: cloneNoFuFixedPoints(baseSettings.noFuFixedPoints),
  };
};

export const normalizeRoomDefaultSettings = (settings?: Partial<GameSettings>): GameSettings => {
  const mode = settings?.mode === '3ma' ? '3ma' : '4ma';

  return normalizeGameSettings({
    ...createDefaultRoomSettings(mode),
    ...settings,
    mode,
  });
};

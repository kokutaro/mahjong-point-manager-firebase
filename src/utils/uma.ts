export const UMA_PRESET_VALUES = {
  none: [0, 0],
  '5-10': [5, 10],
  '10-20': [10, 20],
  '10-30': [10, 30],
} as const satisfies Record<string, readonly [number, number]>;

export const UMA_PRESET_ORDER = ['none', '5-10', '10-20', '10-30'] as const;

export const UMA_PRESET_LABELS: Record<(typeof UMA_PRESET_ORDER)[number], string> = {
  none: 'なし',
  '5-10': 'ゴットー (5-10)',
  '10-20': 'ワンツー (10-20)',
  '10-30': 'ワンスリー (10-30)',
};

export type UmaPresetKey = keyof typeof UMA_PRESET_VALUES;
export type UmaPreset = UmaPresetKey | 'custom';
export type UmaRange = [number, number];

const matchesUma = (left: readonly [number, number], right: readonly [number, number]): boolean => {
  return left[0] === right[0] && left[1] === right[1];
};

export const getUmaPresetValue = (preset: UmaPresetKey): UmaRange => {
  const value = UMA_PRESET_VALUES[preset];
  return [value[0], value[1]];
};

export const detectUmaPreset = (uma: readonly [number, number]): UmaPreset => {
  const preset = UMA_PRESET_ORDER.find((candidate) =>
    matchesUma(uma, UMA_PRESET_VALUES[candidate]),
  );
  return preset ?? 'custom';
};

export const isNoUma = (uma: readonly [number, number]): boolean => {
  return matchesUma(uma, UMA_PRESET_VALUES.none);
};

export const formatUmaDisplay = (uma: readonly [number, number]): string => {
  if (isNoUma(uma)) {
    return 'なし';
  }

  return `${uma[0]}-${uma[1]}`;
};

export const getUmaPointsByRank = (
  uma: readonly [number, number],
  rank: number,
  playerCount: number,
): number => {
  if (playerCount !== 3 && playerCount !== 4) {
    throw new Error(`Invalid player count for Uma calculation: ${playerCount}`);
  }

  if (isNoUma(uma)) {
    return 0;
  }

  const [low, high] = uma;

  if (playerCount === 4) {
    if (rank === 1) return high;
    if (rank === 2) return low;
    if (rank === 3) return -low;
    if (rank === 4) return -high;
  }

  if (playerCount === 3) {
    if (rank === 1) return high;
    if (rank === 2) return 0;
    if (rank === 3) return -high;
  }
  throw new Error(`Invalid rank for Uma calculation: rank=${rank}, playerCount=${playerCount}`);
};

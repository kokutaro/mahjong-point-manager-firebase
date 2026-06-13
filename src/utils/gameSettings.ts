import type {
  GameResult,
  GameSettings,
  NoFuFixedPointHan,
  NoFuFixedPointValue,
  NoFuFixedPoints,
  RoomSnapshot,
  RoomState,
  RoomStateCore,
} from '../types';

type PartialNoFuFixedPoints = Partial<Record<NoFuFixedPointHan, Partial<NoFuFixedPointValue>>>;

const HAN_LIST: NoFuFixedPointHan[] = [1, 2, 3];
export const DEFAULT_YAKITORI_ENABLED = false;
export const DEFAULT_YAKITORI_POINT = 10;

const sanitizeFixedPoint = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return fallback;
  }

  return Math.max(100, Math.round(normalized / 100) * 100);
};

export const normalizeYakitoriEnabled = (value: unknown): boolean => {
  return value === true;
};

export const normalizeYakitoriPoint = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_YAKITORI_POINT;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return DEFAULT_YAKITORI_POINT;
  }

  return normalized;
};

export const DEFAULT_NO_FU_FIXED_POINTS: NoFuFixedPoints = {
  1: { child: 1000, dealer: 1500 },
  2: { child: 2000, dealer: 3000 },
  3: { child: 4000, dealer: 6000 },
};

export const cloneNoFuFixedPoints = (
  noFuFixedPoints: NoFuFixedPoints = DEFAULT_NO_FU_FIXED_POINTS,
): NoFuFixedPoints => {
  return {
    1: { ...noFuFixedPoints[1] },
    2: { ...noFuFixedPoints[2] },
    3: { ...noFuFixedPoints[3] },
  };
};

export const normalizeNoFuFixedPoints = (
  noFuFixedPoints?: PartialNoFuFixedPoints,
): NoFuFixedPoints => {
  return HAN_LIST.reduce<NoFuFixedPoints>((normalized, han) => {
    const current = noFuFixedPoints?.[han];
    const defaults = DEFAULT_NO_FU_FIXED_POINTS[han];

    return {
      ...normalized,
      [han]: {
        child: sanitizeFixedPoint(current?.child, defaults.child),
        dealer: sanitizeFixedPoint(current?.dealer, defaults.dealer),
      },
    };
  }, cloneNoFuFixedPoints());
};

export const normalizeGameSettings = (settings: GameSettings): GameSettings => {
  return {
    ...settings,
    noFuFixedPoints: normalizeNoFuFixedPoints(settings.noFuFixedPoints),
    yakitoriEnabled: normalizeYakitoriEnabled(settings.yakitoriEnabled),
    yakitoriPoint: normalizeYakitoriPoint(settings.yakitoriPoint),
  };
};

export const normalizeGameResult = (result: GameResult): GameResult => {
  return {
    ...result,
    ruleSnapshot: normalizeGameSettings(result.ruleSnapshot),
  };
};

export const normalizeRoomSnapshot = (room: RoomSnapshot): RoomSnapshot => {
  return {
    ...room,
    settings: normalizeGameSettings(room.settings),
    gameResults: room.gameResults?.map(normalizeGameResult),
  };
};

export const normalizeRoomStateCore = (room: RoomStateCore): RoomStateCore => {
  return {
    ...room,
    settings: normalizeGameSettings(room.settings),
  };
};

export const normalizeRoomState = (room: RoomState): RoomState => {
  return {
    ...normalizeRoomStateCore(room),
    history: room.history?.map(normalizeRoomSnapshot),
    gameResults: room.gameResults?.map(normalizeGameResult),
  };
};

export const normalizeRoomStateUpdate = (updates: Partial<RoomState>): Partial<RoomState> => {
  return {
    ...updates,
    ...(updates.settings ? { settings: normalizeGameSettings(updates.settings) } : {}),
    ...(updates.history ? { history: updates.history.map(normalizeRoomSnapshot) } : {}),
    ...(updates.gameResults ? { gameResults: updates.gameResults.map(normalizeGameResult) } : {}),
  };
};

export const sanitizeFirestoreData = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeFirestoreData(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, unknown>>((sanitized, [key, current]) => {
      if (current === undefined) {
        return sanitized;
      }

      sanitized[key] = sanitizeFirestoreData(current);
      return sanitized;
    }, {}) as T;
  }

  return value;
};

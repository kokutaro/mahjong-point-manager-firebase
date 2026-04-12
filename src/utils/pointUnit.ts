const POINT_UNIT = 1000;

export const normalizePointUnit = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value / POINT_UNIT) * POINT_UNIT);
};

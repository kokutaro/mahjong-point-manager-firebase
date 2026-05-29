import { describe, expect, it } from 'vitest';
import { WIND_LABELS, WIND_ORDER, windToKanji } from './wind';

describe('windToKanji', () => {
  it('converts East to 東', () => {
    expect(windToKanji('East')).toBe('東');
  });

  it('converts South to 南', () => {
    expect(windToKanji('South')).toBe('南');
  });

  it('converts West to 西', () => {
    expect(windToKanji('West')).toBe('西');
  });

  it('converts North to 北', () => {
    expect(windToKanji('North')).toBe('北');
  });

  it('returns the input as-is for unknown values', () => {
    expect(windToKanji('Unknown')).toBe('Unknown');
  });
});

describe('WIND_LABELS', () => {
  it('contains all 4 winds', () => {
    expect(Object.keys(WIND_LABELS)).toHaveLength(4);
  });
});

describe('WIND_ORDER', () => {
  it('is East, South, West, North', () => {
    expect(WIND_ORDER).toEqual(['East', 'South', 'West', 'North']);
  });
});

import { describe, expect, it } from 'vitest';
import type { Player } from '../types';
import { rotatePlayerWinds, WIND_LABELS, WIND_ORDER, windToKanji } from './wind';

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

describe('rotatePlayerWinds', () => {
  const makePlayer = (id: string, wind: Player['wind']): Player => ({
    id,
    name: id,
    score: 25000,
    isRiichi: false,
    wind,
    chip: 0,
  });

  it('rotates each 4-player wind independently of array order', () => {
    const players = [
      makePlayer('tomoaki', 'East'),
      makePlayer('kondo', 'West'),
      makePlayer('takahashi', 'South'),
      makePlayer('ohara', 'North'),
    ];

    const result = rotatePlayerWinds(players, false);

    expect(Object.fromEntries(result.map((player) => [player.id, player.wind]))).toEqual({
      tomoaki: 'North',
      kondo: 'South',
      takahashi: 'East',
      ohara: 'West',
    });
  });

  it('uses the three-player wind cycle without assigning North', () => {
    const players = [
      makePlayer('west', 'West'),
      makePlayer('east', 'East'),
      makePlayer('south', 'South'),
    ];

    const result = rotatePlayerWinds(players, false);

    expect(Object.fromEntries(result.map((player) => [player.id, player.wind]))).toEqual({
      west: 'South',
      east: 'West',
      south: 'East',
    });
  });

  it('does not rotate winds during a dealer continuation', () => {
    const players = [makePlayer('east', 'East'), makePlayer('south', 'South')];

    expect(rotatePlayerWinds(players, true)).toBe(players);
  });
});

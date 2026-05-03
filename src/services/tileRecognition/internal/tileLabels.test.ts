import { describe, expect, it } from 'vitest';
import { DEFAULT_TILE_LABELS, normalizeLabelToTileCode } from './tileLabels';

describe('DEFAULT_TILE_LABELS', () => {
  it('contains 37 tiles (34 + 3 reds)', () => {
    expect(DEFAULT_TILE_LABELS).toHaveLength(37);
  });
});

describe('normalizeLabelToTileCode', () => {
  it.each([
    ['1m', '1m'],
    ['9p', '9p'],
    ['5z', '5z'],
    ['0m', '0m'],
    ['man3', '3m'],
    ['pin5', '5p'],
    ['sou9', '9s'],
    ['5p_red', '0p'],
    ['red5s', '0s'],
    ['haku', '5z'],
    ['hatsu', '6z'],
    ['chun', '7z'],
    ['east', '1z'],
  ])('maps %s -> %s', (input, expected) => {
    expect(normalizeLabelToTileCode(input)).toBe(expected);
  });

  it('returns null for unknown labels', () => {
    expect(normalizeLabelToTileCode('???')).toBeNull();
  });
});

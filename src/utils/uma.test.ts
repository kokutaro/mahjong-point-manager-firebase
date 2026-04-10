import { describe, expect, it } from 'vitest';
import { detectUmaPreset, formatUmaDisplay, getUmaPointsByRank, isNoUma } from './uma';

describe('uma utilities', () => {
  it('detects built-in presets including none', () => {
    expect(detectUmaPreset([0, 0])).toBe('none');
    expect(detectUmaPreset([5, 10])).toBe('5-10');
    expect(detectUmaPreset([10, 20])).toBe('10-20');
    expect(detectUmaPreset([10, 30])).toBe('10-30');
    expect(detectUmaPreset([15, 25])).toBe('custom');
  });

  it('formats [0, 0] as none and other values as ranges', () => {
    expect(formatUmaDisplay([0, 0])).toBe('なし');
    expect(formatUmaDisplay([5, 10])).toBe('5-10');
    expect(formatUmaDisplay([15, 25])).toBe('15-25');
  });

  it('identifies whether uma is disabled', () => {
    expect(isNoUma([0, 0])).toBe(true);
    expect(isNoUma([0, 10])).toBe(false);
  });

  it('returns zero rank points for none preset in both 4ma and 3ma', () => {
    expect(getUmaPointsByRank([0, 0], 1, 4)).toBe(0);
    expect(getUmaPointsByRank([0, 0], 2, 4)).toBe(0);
    expect(getUmaPointsByRank([0, 0], 3, 4)).toBe(0);
    expect(getUmaPointsByRank([0, 0], 4, 4)).toBe(0);
    expect(getUmaPointsByRank([0, 0], 1, 3)).toBe(0);
    expect(getUmaPointsByRank([0, 0], 2, 3)).toBe(0);
    expect(getUmaPointsByRank([0, 0], 3, 3)).toBe(0);
  });
});

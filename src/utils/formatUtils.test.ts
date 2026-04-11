import { describe, expect, it } from 'vitest';
import { formatAverageRank, formatPoint } from './formatUtils';

describe('formatPoint', () => {
  it('formats positive values with + prefix', () => {
    expect(formatPoint(45)).toBe('+45.0');
  });

  it('formats negative values with - prefix', () => {
    expect(formatPoint(-15.5)).toBe('-15.5');
  });

  it('formats zero without prefix', () => {
    expect(formatPoint(0)).toBe('0.0');
  });

  it('rounds to 1 decimal place', () => {
    expect(formatPoint(12.34)).toBe('+12.3');
    expect(formatPoint(-3.78)).toBe('-3.8');
  });

  it('formats large numbers with locale grouping', () => {
    const result = formatPoint(1234.5);
    // Locale-dependent grouping; just verify prefix and decimal
    expect(result).toMatch(/^\+.*1.*234\.5$/);
  });
});

describe('formatAverageRank', () => {
  it('formats integer ranks with a trailing decimal', () => {
    expect(formatAverageRank(1)).toBe('1.0');
  });

  it('keeps one decimal place for fractional ranks', () => {
    expect(formatAverageRank(2.4)).toBe('2.4');
  });

  it('rounds to one decimal place when needed', () => {
    expect(formatAverageRank(1.25)).toBe('1.3');
  });
});

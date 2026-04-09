import { describe, expect, it } from 'vitest';
import { formatPoint } from './formatUtils';

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

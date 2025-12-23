import { describe, expect, it } from 'vitest'; // Using vitest directly
import { calculatePasswordStrength } from '../../utils/passwordStrength';

describe('calculatePasswordStrength', () => {
  it('returns weak for short password', () => {
    const result = calculatePasswordStrength('123');
    expect(result.label).toBe('短すぎます');
    expect(result.score).toBe(1);
  });

  it('returns weak for simple password', () => {
    const result = calculatePasswordStrength('password');
    expect(result.label).toBe('弱い');
  });

  it('returns medium for moderate password', () => {
    // 9 chars, Uppercase, Number -> Score 3
    const result = calculatePasswordStrength('Password1');
    expect(result.label).toBe('普通');
    expect(result.score).toBe(3);
  });

  it('returns strong for strong password', () => {
    // len>=10, A-Z, 0-9, symbol
    const result = calculatePasswordStrength('Password123!');
    expect(result.label).toBe('強い');
    expect(result.score).toBe(4);
  });
});

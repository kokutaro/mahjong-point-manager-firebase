import { describe, expect, it } from 'vitest';
import { hashPasscode } from './hash';

describe('hashPasscode', () => {
  it('should return SHA-256 hex for empty string without salt', async () => {
    const result = await hashPasscode('');
    // SHA-256 of empty string
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('should return the same hash for the same input and salt', async () => {
    const result1 = await hashPasscode('hello', 'salt123');
    const result2 = await hashPasscode('hello', 'salt123');
    expect(result1).toBe(result2);
  });

  it('should return different hashes for same input with different salts', async () => {
    const result1 = await hashPasscode('hello', 'salt1');
    const result2 = await hashPasscode('hello', 'salt2');
    expect(result1).not.toBe(result2);
  });

  it('should return different hash when salt is provided vs not', async () => {
    const withoutSalt = await hashPasscode('test');
    const withSalt = await hashPasscode('test', 'comp123');
    expect(withoutSalt).not.toBe(withSalt);
  });
});

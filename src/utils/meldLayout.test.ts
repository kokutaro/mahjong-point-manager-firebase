import { describe, expect, it } from 'vitest';
import { getSidewaysIndex, isAnkanBackTile } from './meldLayout';
import type { Meld } from '../types/analysis';

describe('getSidewaysIndex', () => {
  it('chi → 0 (左端が横向き)', () => {
    const meld: Meld = { kind: 'chi', tiles: ['1s', '2s', '3s'], from: 'kamicha' };
    expect(getSidewaysIndex(meld)).toBe(0);
  });

  it('pon shimocha → 0', () => {
    const meld: Meld = { kind: 'pon', tiles: ['1z', '1z', '1z'], from: 'shimocha' };
    expect(getSidewaysIndex(meld)).toBe(0);
  });

  it('pon toimen → 1', () => {
    const meld: Meld = { kind: 'pon', tiles: ['1z', '1z', '1z'], from: 'toimen' };
    expect(getSidewaysIndex(meld)).toBe(1);
  });

  it('pon kamicha → 2', () => {
    const meld: Meld = { kind: 'pon', tiles: ['1z', '1z', '1z'], from: 'kamicha' };
    expect(getSidewaysIndex(meld)).toBe(2);
  });

  it('minkan shimocha → 0', () => {
    const meld: Meld = { kind: 'minkan', tiles: ['2s', '2s', '2s', '2s'], from: 'shimocha' };
    expect(getSidewaysIndex(meld)).toBe(0);
  });

  it('minkan toimen → 1', () => {
    const meld: Meld = { kind: 'minkan', tiles: ['2s', '2s', '2s', '2s'], from: 'toimen' };
    expect(getSidewaysIndex(meld)).toBe(1);
  });

  it('minkan kamicha → 3', () => {
    const meld: Meld = { kind: 'minkan', tiles: ['2s', '2s', '2s', '2s'], from: 'kamicha' };
    expect(getSidewaysIndex(meld)).toBe(3);
  });

  it('ankan → null (横向きなし)', () => {
    const meld: Meld = { kind: 'ankan', tiles: ['2z', '2z', '2z', '2z'] };
    expect(getSidewaysIndex(meld)).toBeNull();
  });

  it('kakan shimocha → 0 (ポンと同じ位置)', () => {
    const meld: Meld = { kind: 'kakan', tiles: ['2s', '2s', '2s', '2s'], from: 'shimocha' };
    expect(getSidewaysIndex(meld)).toBe(0);
  });

  it('kakan toimen → 1', () => {
    const meld: Meld = { kind: 'kakan', tiles: ['2s', '2s', '2s', '2s'], from: 'toimen' };
    expect(getSidewaysIndex(meld)).toBe(1);
  });

  it('kakan kamicha → 2', () => {
    const meld: Meld = { kind: 'kakan', tiles: ['2s', '2s', '2s', '2s'], from: 'kamicha' };
    expect(getSidewaysIndex(meld)).toBe(2);
  });
});

describe('isAnkanBackTile', () => {
  it('index 0 → true (裏)', () => {
    expect(isAnkanBackTile(0)).toBe(true);
  });

  it('index 1 → false (表)', () => {
    expect(isAnkanBackTile(1)).toBe(false);
  });

  it('index 2 → false (表)', () => {
    expect(isAnkanBackTile(2)).toBe(false);
  });

  it('index 3 → true (裏)', () => {
    expect(isAnkanBackTile(3)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  TEMPLATE_H,
  TEMPLATE_LEN,
  TEMPLATE_W,
  dot,
  normalize,
  otsuThreshold,
  resampleNearest,
  rgbaToGrayscale,
} from './imageOps';

describe('rgbaToGrayscale', () => {
  it('白(255,255,255) → 1.0、黒(0,0,0) → 0.0、純赤・純緑・純青の輝度係数を反映する', () => {
    const rgba = new Uint8ClampedArray([
      255,
      255,
      255,
      255, // white
      0,
      0,
      0,
      255, // black
      255,
      0,
      0,
      255, // red → 0.299
      0,
      255,
      0,
      255, // green → 0.587
      0,
      0,
      255,
      255, // blue → 0.114
    ]);
    const gray = rgbaToGrayscale(rgba, 5, 1);
    expect(gray[0]).toBeCloseTo(1, 5);
    expect(gray[1]).toBeCloseTo(0, 5);
    expect(gray[2]).toBeCloseTo(0.299, 3);
    expect(gray[3]).toBeCloseTo(0.587, 3);
    expect(gray[4]).toBeCloseTo(0.114, 3);
  });
});

describe('normalize', () => {
  it('ゼロ平均・単位ノルムに正規化する', () => {
    const data = new Float32Array([1, 2, 3, 4]);
    expect(normalize(data)).toBe(true);
    const sum = data.reduce((a, b) => a + b, 0);
    const sq = data.reduce((a, b) => a + b * b, 0);
    expect(sum).toBeCloseTo(0, 5);
    expect(sq).toBeCloseTo(1, 5);
  });

  it('全要素が同じ値なら false を返す', () => {
    const data = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    expect(normalize(data)).toBe(false);
  });
});

describe('dot', () => {
  it('正規化済みベクトル同士の内積は 1 (自分自身) になる', () => {
    const data = new Float32Array([1, 2, 3, 4]);
    normalize(data);
    expect(dot(data, data)).toBeCloseTo(1, 5);
  });

  it('直交パターンは 0 に近い値になる', () => {
    const a = new Float32Array([1, -1, 1, -1]);
    const b = new Float32Array([1, 1, -1, -1]);
    normalize(a);
    normalize(b);
    expect(dot(a, b)).toBeCloseTo(0, 5);
  });
});

describe('resampleNearest', () => {
  it('指定サイズの Float32Array を返す', () => {
    const src = new Float32Array(10 * 10).fill(0.5);
    const out = resampleNearest(src, 10, 10);
    expect(out.length).toBe(TEMPLATE_LEN);
    expect(out[0]).toBe(0.5);
  });

  it('カスタムサイズ指定時はそのサイズを返す', () => {
    const src = new Float32Array(4 * 4);
    for (let i = 0; i < src.length; i++) src[i] = i / 16;
    const out = resampleNearest(src, 4, 4, 2, 2);
    expect(out.length).toBe(4);
  });

  it('テンプレートサイズ定数が公開されている', () => {
    expect(TEMPLATE_W).toBe(64);
    expect(TEMPLATE_H).toBe(96);
  });
});

describe('otsuThreshold', () => {
  it('明暗 2 値の画像で中間値付近を返す', () => {
    const data = new Float32Array(200);
    for (let i = 0; i < 100; i++) data[i] = 0.1;
    for (let i = 100; i < 200; i++) data[i] = 0.9;
    const t = otsuThreshold(data);
    expect(t).toBeGreaterThan(0.1);
    expect(t).toBeLessThan(0.9);
  });
});

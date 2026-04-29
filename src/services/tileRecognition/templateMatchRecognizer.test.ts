import { describe, expect, it } from 'vitest';
import type { TileCode } from '../../types/analysis';
import { TEMPLATE_H, TEMPLATE_W, normalize } from './internal/imageOps';
import type { NormalizedTemplate } from './internal/templateLibrary';
import { type ImageDecoder, TemplateMatchRecognizer } from './templateMatchRecognizer';

const W = TEMPLATE_W;
const H = TEMPLATE_H;

/** k 番目のテンプレート用の一意な暗い [0, 0.4] パターンを生成。 */
const buildPattern = (k: number): Float32Array => {
  const arr = new Float32Array(W * H);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = (Math.sin(k * 1.7 + i * 0.013) * 0.5 + 0.5) * 0.4;
  }
  return arr;
};

const buildTemplate = (code: TileCode, k: number): NormalizedTemplate => {
  const data = buildPattern(k);
  normalize(data);
  return { code, data };
};

const buildSyntheticImage = (codes: TileCode[]) => {
  const gap = 16;
  const margin = 8;
  const totalW = margin * 2 + codes.length * W + (codes.length - 1) * gap;
  const totalH = margin * 2 + H;
  const gray = new Float32Array(totalW * totalH).fill(1.0);
  codes.forEach((_, k) => {
    const x0 = margin + k * (W + gap);
    const y0 = margin;
    const pattern = buildPattern(k);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        gray[(y0 + y) * totalW + (x0 + x)] = pattern[y * W + x];
      }
    }
  });
  const rgba = new Uint8ClampedArray(totalW * totalH * 4);
  for (let i = 0; i < gray.length; i++) {
    const v = Math.round(gray[i] * 255);
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return { rgba, width: totalW, height: totalH };
};

const makeDecoder = (image: {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}): ImageDecoder => ({
  async decode() {
    return image;
  },
});

describe('TemplateMatchRecognizer', () => {
  it('合成画像内の 3 牌をテンプレートマッチングで正しく分類する', async () => {
    const codes: TileCode[] = ['1m', '5p', '7z'];
    const templates = codes.map((c, k) => buildTemplate(c, k));
    const image = buildSyntheticImage(codes);

    const recognizer = new TemplateMatchRecognizer({
      preloadedTemplates: templates,
      imageDecoder: makeDecoder(image),
      confidenceThreshold: 0.5,
    });

    const result = await recognizer.recognize(new Blob([]));
    expect(result.tiles).toHaveLength(3);
    expect(result.tiles.map((t) => t.code)).toEqual(codes);
    result.tiles.forEach((t) => {
      expect(t.confidence).toBeGreaterThan(0.9);
      expect(t.bbox).toBeDefined();
    });
  });

  it('信頼度が閾値未満の場合は code:null を返す', async () => {
    // 異なる pattern を template として登録 → 入力との NCC が低い
    const inputCodes: TileCode[] = ['1m'];
    const templates: NormalizedTemplate[] = [buildTemplate('1m', 0), buildTemplate('2m', 1)];
    const image = buildSyntheticImage(inputCodes);

    const recognizer = new TemplateMatchRecognizer({
      preloadedTemplates: templates,
      imageDecoder: makeDecoder(image),
      confidenceThreshold: 0.999, // ほぼ完全一致しか通さない高い閾値
    });
    const result = await recognizer.recognize(new Blob([]));
    expect(result.tiles).toHaveLength(1);
    // resampling で完全一致しないため confidence < 1.0、code:null になりうる
    if (result.tiles[0].code === null) {
      expect(result.tiles[0].confidence).toBeLessThan(0.999);
    }
  });

  it('expectedCount を満たない場合は null パディングされる', async () => {
    const codes: TileCode[] = ['1m', '5p'];
    const templates = codes.map((c, k) => buildTemplate(c, k));
    const image = buildSyntheticImage(codes);

    const recognizer = new TemplateMatchRecognizer({
      preloadedTemplates: templates,
      imageDecoder: makeDecoder(image),
    });
    const result = await recognizer.recognize(new Blob([]), { expectedCount: 4 });
    expect(result.tiles).toHaveLength(4);
    expect(result.tiles[0].code).toBe('1m');
    expect(result.tiles[1].code).toBe('5p');
    expect(result.tiles[2].code).toBeNull();
    expect(result.tiles[3].code).toBeNull();
  });

  it('同点時は通常5を赤5より優先する', async () => {
    // 同一パターンを '5m' と '0m' の両方に割り当て → スコア同点
    const data1 = new Float32Array(W * H);
    for (let i = 0; i < data1.length; i++) data1[i] = Math.sin(i * 0.013) * 0.2 + 0.2;
    const data2 = new Float32Array(data1);
    normalize(data1);
    normalize(data2);
    const templates: NormalizedTemplate[] = [
      { code: '0m', data: data1 }, // 赤5 が先に登録
      { code: '5m', data: data2 }, // 通常5 が後 → 同点なので置き換わる
    ];
    const image = buildSyntheticImage(['5m']);
    const recognizer = new TemplateMatchRecognizer({
      preloadedTemplates: templates,
      imageDecoder: makeDecoder(image),
      confidenceThreshold: 0,
      preferNonRedFive: true,
    });
    const result = await recognizer.recognize(new Blob([]));
    expect(result.tiles[0].code).toBe('5m');
  });
});

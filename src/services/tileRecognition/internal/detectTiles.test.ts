import { describe, expect, it } from 'vitest';
import { cropGray, detectTileBoxes } from './detectTiles';

/** 横に N 個の暗い矩形 (牌) を白背景に並べた合成画像を生成。 */
const buildSyntheticRow = (
  count: number,
  tileW: number,
  tileH: number,
  gap: number,
  margin: number,
): { gray: Float32Array; width: number; height: number } => {
  const width = margin * 2 + count * tileW + (count - 1) * gap;
  const height = margin * 2 + tileH;
  const gray = new Float32Array(width * height).fill(0.95); // background ≈ white
  for (let i = 0; i < count; i++) {
    const x0 = margin + i * (tileW + gap);
    for (let y = margin; y < margin + tileH; y++) {
      for (let x = x0; x < x0 + tileW; x++) {
        gray[y * width + x] = 0.1; // tile ≈ dark
      }
    }
  }
  return { gray, width, height };
};

describe('detectTileBoxes', () => {
  it('間隔のある複数牌を個別に検出する', () => {
    const { gray, width, height } = buildSyntheticRow(3, 30, 45, 8, 5);
    const boxes = detectTileBoxes(gray, width, height);
    expect(boxes).toHaveLength(3);
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
    expect(boxes[1].x).toBeLessThan(boxes[2].x);
    boxes.forEach((b) => {
      expect(b.width).toBeGreaterThan(20);
      expect(b.height).toBeGreaterThan(35);
    });
  });

  it('expectedCount 不一致時は等分割でフォールバックする (gap=0)', () => {
    const { gray, width, height } = buildSyntheticRow(4, 30, 45, 0, 5);
    const boxes = detectTileBoxes(gray, width, height, { expectedCount: 4 });
    expect(boxes).toHaveLength(4);
    expect(boxes[0].x).toBeLessThan(boxes[3].x);
  });

  it('全画素が背景なら空配列を返す', () => {
    const w = 20;
    const h = 20;
    const gray = new Float32Array(w * h).fill(0.95);
    const boxes = detectTileBoxes(gray, w, h);
    expect(boxes).toHaveLength(0);
  });
});

describe('cropGray', () => {
  it('指定矩形を切り出す', () => {
    const w = 4;
    const h = 4;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < gray.length; i++) gray[i] = i;
    const crop = cropGray(gray, w, h, { x: 1, y: 1, width: 2, height: 2 });
    expect(crop.width).toBe(2);
    expect(crop.height).toBe(2);
    expect(Array.from(crop.data)).toEqual([5, 6, 9, 10]);
  });

  it('画像範囲外の bbox はクリップされる', () => {
    const w = 3;
    const h = 3;
    const gray = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const crop = cropGray(gray, w, h, { x: 2, y: 2, width: 5, height: 5 });
    expect(crop.width).toBe(1);
    expect(crop.height).toBe(1);
    expect(crop.data[0]).toBe(9);
  });
});

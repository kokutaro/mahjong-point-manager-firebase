import { otsuThreshold } from './imageOps';

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectOptions {
  /** 期待される牌枚数。指定時は等分割フォールバックに使用される。 */
  expectedCount?: number;
  /** 牌の縦横比 (height/width)。デフォルト 1.5 (= 2:3)。 */
  aspectRatio?: number;
  /** 縦横比のずれ許容率。 */
  aspectTolerance?: number;
  /** 牌1枚の最小幅 (画像幅に対する比率)。 */
  minWidthRatio?: number;
  /** 列が「前景」とみなされる前景比率の閾値。 */
  columnForegroundRatio?: number;
}

/**
 * 横一列に並んだ牌の輪郭を、列方向の前景プロジェクションから検出する。
 *
 * アルゴリズム:
 *   1. 大津で二値化 (前景=暗い側、背景=明るい側)
 *   2. 各列について「前景画素率」を計算
 *   3. 閾値超のランを連結し、列範囲を得る
 *   4. 縦横比でフィルタ
 *   5. ランが見つからない / 数が合わない場合は expectedCount による等分割でフォールバック
 *
 * 入力 `gray` は [0,1] の Float32Array (rgbaToGrayscale 出力)。
 */
export const detectTileBoxes = (
  gray: Float32Array,
  width: number,
  height: number,
  options: DetectOptions = {},
): BBox[] => {
  const {
    expectedCount,
    aspectRatio = 1.5,
    aspectTolerance = 0.5,
    minWidthRatio = 0.02,
    columnForegroundRatio = 0.15,
  } = options;

  if (width <= 0 || height <= 0 || gray.length !== width * height) return [];

  const threshold = otsuThreshold(gray);
  // 列ごとの前景画素数
  const colFg = new Uint32Array(width);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      // 牌は背景より暗いと仮定 (黒線/数字を含むため平均的に低輝度)
      if (gray[row + x] < threshold) colFg[x]++;
    }
  }

  // 列が前景とみなされる閾値
  const colMin = Math.max(1, Math.floor(height * columnForegroundRatio));

  // 連続した前景列のランを抽出
  const runs: BBox[] = [];
  let runStart = -1;
  const minWidth = Math.max(2, Math.floor(width * minWidthRatio));
  for (let x = 0; x < width; x++) {
    const isFg = colFg[x] >= colMin;
    if (isFg && runStart < 0) runStart = x;
    if ((!isFg || x === width - 1) && runStart >= 0) {
      const end = isFg ? width : x;
      const w = end - runStart;
      if (w >= minWidth) {
        // 該当ラン内の縦範囲も求める
        let yMin = height;
        let yMax = -1;
        for (let xi = runStart; xi < end; xi++) {
          for (let y = 0; y < height; y++) {
            if (gray[y * width + xi] < threshold) {
              if (y < yMin) yMin = y;
              if (y > yMax) yMax = y;
            }
          }
        }
        if (yMax >= yMin) {
          runs.push({ x: runStart, y: yMin, width: w, height: yMax - yMin + 1 });
        }
      }
      runStart = -1;
    }
  }

  // 縦横比フィルタ
  const filtered = runs.filter((r) => {
    const ratio = r.height / r.width;
    return Math.abs(ratio - aspectRatio) <= aspectTolerance;
  });

  if (filtered.length > 0) {
    return filtered.sort((a, b) => a.x - b.x);
  }

  // 何も検出できなかった場合のみ: expectedCount による等分割でフォールバック
  if (expectedCount && expectedCount > 0) {
    let yMin = height;
    let yMax = -1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        if (gray[row + x] < threshold) {
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
          break;
        }
      }
    }
    if (yMax < yMin) return filtered.sort((a, b) => a.x - b.x);
    const tileW = Math.floor(width / expectedCount);
    const tileH = yMax - yMin + 1;
    const boxes: BBox[] = [];
    for (let i = 0; i < expectedCount; i++) {
      boxes.push({ x: i * tileW, y: yMin, width: tileW, height: tileH });
    }
    return boxes;
  }

  return filtered.sort((a, b) => a.x - b.x);
};

/** Float32Array (gray, w*h) から BBox 範囲を切り出す。 */
export const cropGray = (
  gray: Float32Array,
  width: number,
  height: number,
  bbox: BBox,
): { data: Float32Array; width: number; height: number } => {
  const x0 = Math.max(0, Math.floor(bbox.x));
  const y0 = Math.max(0, Math.floor(bbox.y));
  const x1 = Math.min(width, Math.floor(bbox.x + bbox.width));
  const y1 = Math.min(height, Math.floor(bbox.y + bbox.height));
  const w = Math.max(0, x1 - x0);
  const h = Math.max(0, y1 - y0);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const srcRow = (y0 + y) * width + x0;
    const dstRow = y * w;
    for (let x = 0; x < w; x++) out[dstRow + x] = gray[srcRow + x];
  }
  return { data: out, width: w, height: h };
};

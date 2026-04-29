/**
 * テンプレートマッチング用の純関数群。
 * いずれも DOM/Canvas 非依存で、ユニットテストで直接検証可能。
 */

export const TEMPLATE_W = 64;
export const TEMPLATE_H = 96;
export const TEMPLATE_LEN = TEMPLATE_W * TEMPLATE_H;

/** 4ch RGBA を [0,1] のグレースケール Float32Array に変換する。 */
export const rgbaToGrayscale = (
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Float32Array => {
  const out = new Float32Array(width * height);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) {
    out[j] = (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) / 255;
  }
  return out;
};

/**
 * Float32Array をゼロ平均・単位ノルム化 (in-place)。
 * 標準偏差が極めて小さい場合は false を返す (NCC の分母 0 回避)。
 */
export const normalize = (data: Float32Array): boolean => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length;

  let sqSum = 0;
  for (let i = 0; i < data.length; i++) {
    data[i] -= mean;
    sqSum += data[i] * data[i];
  }
  const norm = Math.sqrt(sqSum);
  if (norm < 1e-6) return false;

  const inv = 1 / norm;
  for (let i = 0; i < data.length; i++) data[i] *= inv;
  return true;
};

/** 等長 Float32Array の内積。両者が normalize() 済みなら NCC スコアになる。 */
export const dot = (a: Float32Array, b: Float32Array): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

/** グレースケール画像をテンプレートサイズに最近傍リサンプル。 */
export const resampleNearest = (
  src: Float32Array,
  srcW: number,
  srcH: number,
  dstW = TEMPLATE_W,
  dstH = TEMPLATE_H,
): Float32Array => {
  const out = new Float32Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(srcH - 1, Math.floor((y * srcH) / dstH));
    const rowSrc = sy * srcW;
    const rowDst = y * dstW;
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(srcW - 1, Math.floor((x * srcW) / dstW));
      out[rowDst + x] = src[rowSrc + sx];
    }
  }
  return out;
};

/** 大津の二値化閾値を求める ([0,1] 範囲)。 */
export const otsuThreshold = (gray: Float32Array, bins = 64): number => {
  const hist = new Array<number>(bins).fill(0);
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i];
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(v * bins)));
    hist[idx]++;
  }
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < bins; i++) sum += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let bestT = 0;
  for (let t = 0; t < bins; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      bestT = t;
    }
  }
  return (bestT + 1) / bins;
};

import { describe, expect, it } from 'vitest';
import { finalizeDetections, nonMaxSuppression, parseYoloOutput } from './yoloPostprocess';

const buildChannelsFirstOutput = (
  detections: { cx: number; cy: number; w: number; h: number; scores: number[] }[],
  numClasses: number,
  numAnchors: number,
): Float32Array => {
  const channels = 4 + numClasses;
  const data = new Float32Array(channels * numAnchors);
  detections.forEach((det, anchorIdx) => {
    data[0 * numAnchors + anchorIdx] = det.cx;
    data[1 * numAnchors + anchorIdx] = det.cy;
    data[2 * numAnchors + anchorIdx] = det.w;
    data[3 * numAnchors + anchorIdx] = det.h;
    det.scores.forEach((s, c) => {
      data[(4 + c) * numAnchors + anchorIdx] = s;
    });
  });
  return data;
};

describe('parseYoloOutput', () => {
  it('extracts detections above the score threshold (channels-first)', () => {
    // 10 anchors so anchors > channels (real YOLO has anchors >> channels)
    const detections = [
      { cx: 0.1, cy: 0.5, w: 0.05, h: 0.1, scores: [0.9, 0.1] },
      { cx: 0.5, cy: 0.5, w: 0.05, h: 0.1, scores: [0.2, 0.85] },
      { cx: 0.9, cy: 0.5, w: 0.05, h: 0.1, scores: [0.3, 0.3] }, // 低スコア
      ...Array.from({ length: 7 }, () => ({
        cx: 0,
        cy: 0,
        w: 0,
        h: 0,
        scores: [0, 0],
      })),
    ];
    const data = buildChannelsFirstOutput(detections, 2, 10);
    const result = parseYoloOutput(data, [1, 6, 10], 0.5);
    expect(result).toHaveLength(2);
    expect(result[0].classIndex).toBe(0);
    expect(result[0].score).toBeCloseTo(0.9);
    expect(result[1].classIndex).toBe(1);
  });

  it('handles channels-last layout', () => {
    const numAnchors = 10;
    const numClasses = 2;
    const channels = 4 + numClasses;
    const data = new Float32Array(numAnchors * channels);
    // anchor 0: class 1, score 0.7
    data[0 * channels + 0] = 0.4;
    data[0 * channels + 1] = 0.4;
    data[0 * channels + 2] = 0.1;
    data[0 * channels + 3] = 0.1;
    data[0 * channels + 5] = 0.7;
    const result = parseYoloOutput(data, [1, numAnchors, channels], 0.5);
    expect(result).toHaveLength(1);
    expect(result[0].classIndex).toBe(1);
  });
});

describe('nonMaxSuppression', () => {
  it('suppresses overlapping detections of the same area', () => {
    const dets = [
      { cx: 0.5, cy: 0.5, w: 0.2, h: 0.2, classIndex: 0, score: 0.9 },
      { cx: 0.51, cy: 0.5, w: 0.2, h: 0.2, classIndex: 0, score: 0.8 }, // 重なり大
      { cx: 0.9, cy: 0.5, w: 0.1, h: 0.1, classIndex: 0, score: 0.7 }, // 別領域
    ];
    const kept = nonMaxSuppression(dets, 0.5);
    expect(kept).toHaveLength(2);
    expect(kept[0].score).toBe(0.9);
    expect(kept[1].cx).toBeCloseTo(0.9);
  });
});

describe('finalizeDetections', () => {
  it('sorts by x-center and converts to image coords', () => {
    const dets = [
      { cx: 0.8, cy: 0.5, w: 0.1, h: 0.2, classIndex: 0, score: 0.9 },
      { cx: 0.2, cy: 0.5, w: 0.1, h: 0.2, classIndex: 1, score: 0.8 },
    ];
    const labels = ['1m', '2m'] as const;
    const result = finalizeDetections(dets, 1000, 500, (i) => labels[i]);
    expect(result.map((r) => r.code)).toEqual(['2m', '1m']);
    expect(result[0].bbox.x).toBeCloseTo(150);
    expect(result[0].bbox.width).toBeCloseTo(100);
  });

  it('returns null when label mapping fails', () => {
    const dets = [{ cx: 0.5, cy: 0.5, w: 0.1, h: 0.1, classIndex: 99, score: 0.9 }];
    const result = finalizeDetections(dets, 100, 100, () => null);
    expect(result[0].code).toBeNull();
  });
});

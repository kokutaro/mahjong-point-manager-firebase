import { describe, expect, it } from 'vitest';
import type { ImageDecoder, TfliteInferenceBackend } from './tfliteRecognizer';
import { TfliteTileRecognizer } from './tfliteRecognizer';

const fakeDecoder: ImageDecoder = {
  async decode() {
    // 100x100 の真っ白画像を返す
    const rgba = new Uint8ClampedArray(100 * 100 * 4);
    rgba.fill(255);
    return { rgba, width: 100, height: 100 };
  },
};

const buildBackend = (
  detections: { cx: number; cy: number; w: number; h: number; classIndex: number; score: number }[],
  numClasses: number,
): TfliteInferenceBackend => ({
  async infer() {
    // 本番モデルと同様に anchors > channels となるようパディングする
    const channels = 4 + numClasses;
    const numAnchors = Math.max(detections.length, channels + 5);
    const data = new Float32Array(channels * numAnchors);
    detections.forEach((d, a) => {
      data[0 * numAnchors + a] = d.cx;
      data[1 * numAnchors + a] = d.cy;
      data[2 * numAnchors + a] = d.w;
      data[3 * numAnchors + a] = d.h;
      data[(4 + d.classIndex) * numAnchors + a] = d.score;
    });
    return { data, shape: [1, channels, numAnchors] };
  },
});

describe('TfliteTileRecognizer', () => {
  it('returns recognized tiles sorted by x-center, mapped via labels', async () => {
    const recognizer = new TfliteTileRecognizer({
      backend: buildBackend(
        [
          { cx: 0.8, cy: 0.5, w: 0.05, h: 0.1, classIndex: 0, score: 0.9 },
          { cx: 0.2, cy: 0.5, w: 0.05, h: 0.1, classIndex: 1, score: 0.85 },
        ],
        2,
      ),
      imageDecoder: fakeDecoder,
      labels: ['1m', '2m'],
      inputSize: 64,
      scoreThreshold: 0.5,
    });
    const result = await recognizer.recognize(new Blob());
    expect(result.tiles.map((t) => t.code)).toEqual(['2m', '1m']);
    expect(result.tiles[0].confidence).toBeGreaterThan(0.8);
  });

  it('pads to expectedCount when fewer detections than expected', async () => {
    const recognizer = new TfliteTileRecognizer({
      backend: buildBackend([{ cx: 0.5, cy: 0.5, w: 0.1, h: 0.2, classIndex: 0, score: 0.9 }], 1),
      imageDecoder: fakeDecoder,
      labels: ['1m'],
      inputSize: 64,
      scoreThreshold: 0.5,
    });
    const result = await recognizer.recognize(new Blob(), { expectedCount: 14 });
    expect(result.tiles).toHaveLength(14);
    expect(result.tiles[0].code).toBe('1m');
    expect(result.tiles[1].code).toBeNull();
  });

  it('filters out detections below scoreThreshold', async () => {
    const recognizer = new TfliteTileRecognizer({
      backend: buildBackend([{ cx: 0.5, cy: 0.5, w: 0.1, h: 0.2, classIndex: 0, score: 0.2 }], 1),
      imageDecoder: fakeDecoder,
      labels: ['1m'],
      inputSize: 64,
      scoreThreshold: 0.5,
    });
    const result = await recognizer.recognize(new Blob());
    expect(result.tiles).toHaveLength(0);
  });
});

import type { TileCode } from '../../types/analysis';
import type { RecognitionResult, RecognizeOptions, RecognizedTile, TileRecognizer } from './index';
import { padToCount } from './index';
import { finalizeDetections, nonMaxSuppression, parseYoloOutput } from './internal/yoloPostprocess';
import { DEFAULT_TILE_LABELS, normalizeLabelToTileCode } from './internal/tileLabels';

/**
 * 推論バックエンドの抽象化。本番では `@tensorflow/tfjs-tflite` の TFLiteModel を
 * ラップするが、テスト時は任意のスタブを差し込める。
 */
export interface TfliteInferenceBackend {
  /**
   * 前処理済み入力 (NHWC float32, 0..1) を渡し、生出力を `[1, A, B]` 形状で返す。
   */
  infer(
    input: Float32Array,
    inputShape: readonly [number, number, number, number],
  ): Promise<{ data: Float32Array; shape: readonly number[] }>;
}

export interface ImageDecoder {
  decode(input: Blob | ImageBitmap | HTMLImageElement): Promise<{
    rgba: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
  }>;
}

export interface TfliteRecognizerOptions {
  /** モデル `.tflite` の URL。デフォルト `/models/tile-detector/model.tflite` */
  modelUrl?: string;
  /** ラベル定義 `labels.json` の URL。配列または `{ labels: string[] }` を許容。 */
  labelsUrl?: string;
  /** 入力エッジサイズ (正方形)。Roboflow 既定は 640。 */
  inputSize?: number;
  /** 物体スコアしきい値 (デフォルト 0.4)。 */
  scoreThreshold?: number;
  /** NMS IoU しきい値 (デフォルト 0.45)。 */
  iouThreshold?: number;
  /** 推論バックエンド (テスト用)。 */
  backend?: TfliteInferenceBackend;
  /** 画像デコーダ (テスト用)。 */
  imageDecoder?: ImageDecoder;
  /** ラベル取得関数 (テスト用)。 */
  fetchJson?: (url: string) => Promise<unknown>;
  /** ラベル一覧 (事前指定。指定された場合 `labelsUrl` のロードはスキップ)。 */
  labels?: (TileCode | null)[];
}

const DEFAULT_MODEL_URL = '/models/tile-detector/model.tflite';
const DEFAULT_LABELS_URL = '/models/tile-detector/labels.json';
const DEFAULT_INPUT_SIZE = 640;
const DEFAULT_SCORE_THRESHOLD = 0.4;
const DEFAULT_IOU_THRESHOLD = 0.45;

/**
 * TFLite (YOLOv8 互換) を用いた牌画像認識実装。
 *
 *   1. `public/models/tile-detector/model.tflite` を初回ロード
 *   2. 入力画像を letterbox で input_size x input_size の正方形にリサイズ
 *   3. NHWC float32 (0..1) としてモデルへ投入
 *   4. 出力 `[1, 4+nc, anchors]` をパース → スコア閾値 → NMS
 *   5. クラス index → `TileCode` をマッピングして X 座標で並べ替え
 */
export class TfliteTileRecognizer implements TileRecognizer {
  private readonly modelUrl: string;
  private readonly labelsUrl: string;
  private readonly inputSize: number;
  private readonly scoreThreshold: number;
  private readonly iouThreshold: number;
  private readonly imageDecoder: ImageDecoder;
  private readonly fetchJson: (url: string) => Promise<unknown>;
  private readonly explicitLabels: (TileCode | null)[] | null;
  private explicitBackend: TfliteInferenceBackend | null;

  private backendPromise: Promise<TfliteInferenceBackend> | null = null;
  private labelsPromise: Promise<(TileCode | null)[]> | null = null;

  constructor(options: TfliteRecognizerOptions = {}) {
    this.modelUrl = options.modelUrl ?? DEFAULT_MODEL_URL;
    this.labelsUrl = options.labelsUrl ?? DEFAULT_LABELS_URL;
    this.inputSize = options.inputSize ?? DEFAULT_INPUT_SIZE;
    this.scoreThreshold = options.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;
    this.iouThreshold = options.iouThreshold ?? DEFAULT_IOU_THRESHOLD;
    this.imageDecoder = options.imageDecoder ?? createBrowserImageDecoder();
    this.fetchJson =
      options.fetchJson ??
      (async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        return await res.json();
      });
    this.explicitBackend = options.backend ?? null;
    this.explicitLabels = options.labels ?? null;
  }

  async recognize(
    image: Blob | ImageBitmap | HTMLImageElement,
    options?: RecognizeOptions,
  ): Promise<RecognitionResult> {
    const [backend, labels, decoded] = await Promise.all([
      this.ensureBackend(),
      this.ensureLabels(),
      this.imageDecoder.decode(image),
    ]);
    options?.signal?.throwIfAborted?.();

    const { tensor, scale, padX, padY, paddedSize } = letterboxToTensor(
      decoded.rgba,
      decoded.width,
      decoded.height,
      this.inputSize,
    );
    const { data, shape } = await backend.infer(tensor, [1, paddedSize, paddedSize, 3]);
    options?.signal?.throwIfAborted?.();

    const raw = parseYoloOutput(data, shape, this.scoreThreshold);
    const kept = nonMaxSuppression(raw, this.iouThreshold);

    // YOLO 出力は letterbox 後の正規化座標 (0..1) なので、元画像へ逆変換する。
    const finalized = finalizeDetections(
      kept,
      paddedSize,
      paddedSize,
      (idx) => labels[idx] ?? null,
    ).map((d) => {
      const x = (d.bbox.x - padX) / scale;
      const y = (d.bbox.y - padY) / scale;
      const width = d.bbox.width / scale;
      const height = d.bbox.height / scale;
      const tile: RecognizedTile = {
        code: d.code,
        confidence: Math.max(0, Math.min(1, d.score)),
        bbox: { x, y, width, height },
      };
      return tile;
    });

    const tiles = options?.expectedCount ? padToCount(finalized, options.expectedCount) : finalized;

    return {
      tiles,
      debug: {
        rawCount: raw.length,
        keptCount: finalized.length,
        scoreThreshold: this.scoreThreshold,
        iouThreshold: this.iouThreshold,
        inputSize: paddedSize,
      },
    };
  }

  private ensureBackend(): Promise<TfliteInferenceBackend> {
    if (this.explicitBackend) return Promise.resolve(this.explicitBackend);
    if (!this.backendPromise) {
      this.backendPromise = createTfliteBackend(this.modelUrl).then((b) => {
        this.explicitBackend = b;
        return b;
      });
    }
    return this.backendPromise;
  }

  private ensureLabels(): Promise<(TileCode | null)[]> {
    if (this.explicitLabels) return Promise.resolve(this.explicitLabels);
    if (!this.labelsPromise) {
      this.labelsPromise = (async () => {
        try {
          const json = await this.fetchJson(this.labelsUrl);
          return parseLabels(json);
        } catch {
          // labels.json が無ければ既定マッピングを使用
          return DEFAULT_TILE_LABELS;
        }
      })();
    }
    return this.labelsPromise;
  }
}

const parseLabels = (json: unknown): (TileCode | null)[] => {
  const raw: unknown = Array.isArray(json)
    ? json
    : ((json as { labels?: unknown })?.labels ?? null);
  if (!Array.isArray(raw)) {
    throw new Error('labels.json must be an array or { labels: [...] }');
  }
  return raw.map((entry) => (typeof entry === 'string' ? normalizeLabelToTileCode(entry) : null));
};

/**
 * Letterbox リサイズ: アスペクト比を保ったまま inputSize x inputSize に収め、
 * 余白を 0 で埋めた NHWC float32 テンソルを返す。
 */
const letterboxToTensor = (
  rgba: Uint8ClampedArray | Uint8Array,
  srcW: number,
  srcH: number,
  inputSize: number,
): {
  tensor: Float32Array;
  scale: number;
  padX: number;
  padY: number;
  paddedSize: number;
} => {
  const scale = Math.min(inputSize / srcW, inputSize / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const padX = Math.floor((inputSize - newW) / 2);
  const padY = Math.floor((inputSize - newH) / 2);

  // float32 NHWC, 0..1 範囲
  const tensor = new Float32Array(inputSize * inputSize * 3);

  // 最近傍リサンプル (高精度が必要なら bilinear に差し替え可能)
  for (let dy = 0; dy < newH; dy++) {
    const sy = Math.min(srcH - 1, Math.floor(dy / scale));
    for (let dx = 0; dx < newW; dx++) {
      const sx = Math.min(srcW - 1, Math.floor(dx / scale));
      const sIdx = (sy * srcW + sx) * 4;
      const tIdx = ((dy + padY) * inputSize + (dx + padX)) * 3;
      tensor[tIdx] = rgba[sIdx] / 255;
      tensor[tIdx + 1] = rgba[sIdx + 1] / 255;
      tensor[tIdx + 2] = rgba[sIdx + 2] / 255;
    }
  }

  return { tensor, scale, padX, padY, paddedSize: inputSize };
};

const createBrowserImageDecoder = (): ImageDecoder => ({
  async decode(input) {
    const bitmap = await toImageBitmap(input);
    try {
      const w = bitmap.width;
      const h = bitmap.height;
      const canvas =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(w, h)
          : (() => {
              const c = document.createElement('canvas');
              c.width = w;
              c.height = h;
              return c;
            })();
      const ctx = canvas.getContext('2d') as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null;
      if (!ctx) throw new Error('2D context unavailable');
      ctx.drawImage(bitmap, 0, 0);
      const data = ctx.getImageData(0, 0, w, h);
      return { rgba: data.data, width: w, height: h };
    } finally {
      if (typeof bitmap.close === 'function') bitmap.close();
    }
  },
});

const toImageBitmap = async (
  input: Blob | ImageBitmap | HTMLImageElement,
): Promise<ImageBitmap> => {
  if (typeof ImageBitmap !== 'undefined' && input instanceof ImageBitmap) return input;
  if (typeof Blob !== 'undefined' && input instanceof Blob) return await createImageBitmap(input);
  return await createImageBitmap(input as ImageBitmapSource);
};

/**
 * `@tensorflow/tfjs-tflite` を CDN から動的にロードし、本番バックエンドを生成する。
 *
 * 注意: tfjs-tflite の npm パッケージはバンドラーで解決できない壊れた相対 import
 * (`../tflite_web_api_client`) を含むため、UMD ビルドを `<script>` タグ経由で
 * グローバル `window.tflite` として読み込む方式を採用する。
 */
const TFLITE_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/tf-tflite.min.js';

interface TfliteGlobal {
  loadTFLiteModel: (modelUrl: string) => Promise<{
    predict: (input: unknown) => unknown;
  }>;
}

declare global {
  interface Window {
    tflite?: TfliteGlobal;
  }
}

let tfliteScriptPromise: Promise<TfliteGlobal> | null = null;

const loadTfliteGlobal = (): Promise<TfliteGlobal> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('TFLite backend is only available in the browser'));
  }
  if (window.tflite) return Promise.resolve(window.tflite);
  if (tfliteScriptPromise) return tfliteScriptPromise;
  tfliteScriptPromise = new Promise<TfliteGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TFLITE_CDN_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.tflite) resolve(window.tflite);
      else reject(new Error('window.tflite was not defined after script load'));
    };
    script.onerror = () => reject(new Error(`Failed to load tfjs-tflite from ${TFLITE_CDN_URL}`));
    document.head.appendChild(script);
  });
  return tfliteScriptPromise;
};

const createTfliteBackend = async (modelUrl: string): Promise<TfliteInferenceBackend> => {
  const [tflite, tf] = await Promise.all([loadTfliteGlobal(), import('@tensorflow/tfjs')]);
  const model = await tflite.loadTFLiteModel(modelUrl);

  return {
    async infer(input, inputShape) {
      const shape4d: [number, number, number, number] = [
        inputShape[0],
        inputShape[1],
        inputShape[2],
        inputShape[3],
      ];
      const inputTensor = tf.tensor4d(input, shape4d);
      try {
        const rawOut = model.predict(inputTensor);
        const out = rawOut as
          | import('@tensorflow/tfjs').Tensor
          | import('@tensorflow/tfjs').Tensor[];
        const tensor = Array.isArray(out) ? out[0] : out;
        try {
          const data = (await tensor.data()) as Float32Array;
          return { data, shape: tensor.shape };
        } finally {
          if (Array.isArray(out)) {
            out.forEach((t) => t.dispose());
          } else {
            tensor.dispose();
          }
        }
      } finally {
        inputTensor.dispose();
      }
    },
  };
};

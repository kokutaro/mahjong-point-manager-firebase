import type { TileCode } from '../../types/analysis';
import type { RecognitionResult, RecognizeOptions, TileRecognizer } from './index';
import { padToCount } from './index';
import {
  TEMPLATE_LEN,
  dot,
  normalize,
  resampleNearest,
  rgbaToGrayscale,
} from './internal/imageOps';
import { cropGray, detectTileBoxes } from './internal/detectTiles';
import {
  type NormalizedTemplate,
  type TemplateLoader,
  createBrowserTemplateLoader,
  loadTemplates,
} from './internal/templateLibrary';

export interface TemplateMatchOptions {
  /** テンプレート読み込みベース URL。 */
  baseUrl?: string;
  /** テンプレート読み込み実装 (テスト用差し替え)。 */
  loader?: TemplateLoader;
  /** 事前ロード済みテンプレート (テスト/SSR用、指定時は loader より優先)。 */
  preloadedTemplates?: NormalizedTemplate[];
  /** 入力画像のデコード実装 (テスト用差し替え)。 */
  imageDecoder?: ImageDecoder;
  /** 信頼度閾値 (これ未満は code:null)。デフォルト 0.55。 */
  confidenceThreshold?: number;
  /** 同点時に通常5を赤5より優先する (デフォルト true)。 */
  preferNonRedFive?: boolean;
}

/** 入力画像 → ImageData 相当の取得を抽象化する。 */
export interface ImageDecoder {
  decode(input: Blob | ImageBitmap | HTMLImageElement): Promise<{
    rgba: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
  }>;
}

const REDFIVE_BY_NORMAL: Partial<Record<TileCode, TileCode>> = {
  '5m': '0m',
  '5p': '0p',
  '5s': '0s',
};

const isRedFive = (code: TileCode): boolean => code === '0m' || code === '0p' || code === '0s';

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
 * テンプレートマッチング + 古典 CV による牌認識実装。
 *
 * 詳細仕様 / 制約は GitHub Issue #146 を参照。
 *
 *   1. 起動時に `public/img/tiles/light/*.svg` を 64x96 にラスタライズして NCC 用テンプレートを構築
 *   2. 入力画像を OffscreenCanvas で復号 → グレースケール化
 *   3. 列方向の前景プロジェクションで矩形候補を抽出 (`detectTileBoxes`)
 *   4. 各候補をテンプレートサイズに最近傍リサンプル → 正規化 → 全テンプレートと NCC
 *   5. 最大スコアの牌を採用 (閾値未満は null)
 */
export class TemplateMatchRecognizer implements TileRecognizer {
  private templates: NormalizedTemplate[] | null;
  private templatesPromise: Promise<NormalizedTemplate[]> | null = null;
  private readonly loader: TemplateLoader;
  private readonly baseUrl: string;
  private readonly imageDecoder: ImageDecoder;
  private readonly confidenceThreshold: number;
  private readonly preferNonRedFive: boolean;

  constructor(options: TemplateMatchOptions = {}) {
    this.templates = options.preloadedTemplates ?? null;
    this.loader = options.loader ?? createBrowserTemplateLoader();
    this.baseUrl = options.baseUrl ?? '/img/tiles/light/';
    this.imageDecoder = options.imageDecoder ?? createBrowserImageDecoder();
    this.confidenceThreshold = options.confidenceThreshold ?? 0.55;
    this.preferNonRedFive = options.preferNonRedFive ?? true;
  }

  private async ensureTemplates(): Promise<NormalizedTemplate[]> {
    if (this.templates) return this.templates;
    if (!this.templatesPromise) {
      this.templatesPromise = loadTemplates(this.loader, this.baseUrl).then((tpls) => {
        this.templates = tpls;
        return tpls;
      });
    }
    return await this.templatesPromise;
  }

  async recognize(
    image: Blob | ImageBitmap | HTMLImageElement,
    options?: RecognizeOptions,
  ): Promise<RecognitionResult> {
    const templates = await this.ensureTemplates();
    const { rgba, width, height } = await this.imageDecoder.decode(image);
    const gray = rgbaToGrayscale(rgba, width, height);
    const boxes = detectTileBoxes(gray, width, height, {
      expectedCount: options?.expectedCount,
    });

    const tiles = boxes.map((bbox) => {
      const cropped = cropGray(gray, width, height, bbox);
      if (cropped.width === 0 || cropped.height === 0) {
        return { code: null as TileCode | null, confidence: 0, bbox };
      }
      const sized = resampleNearest(cropped.data, cropped.width, cropped.height);
      if (sized.length !== TEMPLATE_LEN || !normalize(sized)) {
        return { code: null as TileCode | null, confidence: 0, bbox };
      }
      const { code, score } = this.matchTemplate(sized, templates);
      const confidence = Math.max(0, Math.min(1, score));
      return {
        code: confidence >= this.confidenceThreshold ? code : null,
        confidence,
        bbox,
      };
    });

    const finalTiles = options?.expectedCount ? padToCount(tiles, options.expectedCount) : tiles;

    return {
      tiles: finalTiles,
      debug: {
        boxCount: boxes.length,
        templateCount: templates.length,
        threshold: this.confidenceThreshold,
      },
    };
  }

  private matchTemplate(
    candidate: Float32Array,
    templates: NormalizedTemplate[],
  ): { code: TileCode; score: number } {
    let bestCode: TileCode = templates[0].code;
    let bestScore = -Infinity;
    for (const t of templates) {
      const s = dot(candidate, t.data);
      if (s > bestScore) {
        bestScore = s;
        bestCode = t.code;
      } else if (
        this.preferNonRedFive &&
        s === bestScore &&
        isRedFive(bestCode) &&
        REDFIVE_BY_NORMAL[t.code] === bestCode
      ) {
        bestCode = t.code;
      }
    }
    return { code: bestCode, score: bestScore };
  }
}

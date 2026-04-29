import type { TileCode } from '../../../types/analysis';
import { TEMPLATE_LEN, normalize, rgbaToGrayscale, resampleNearest } from './imageOps';

/**
 * `public/img/tiles/light/` のファイル名 → TileCode 対応表。
 * 表面なし (Back/Blank/Front) は除外。
 */
export const TILE_TEMPLATE_FILES: Readonly<Record<TileCode, string>> = {
  '1m': 'Man1.svg',
  '2m': 'Man2.svg',
  '3m': 'Man3.svg',
  '4m': 'Man4.svg',
  '5m': 'Man5.svg',
  '6m': 'Man6.svg',
  '7m': 'Man7.svg',
  '8m': 'Man8.svg',
  '9m': 'Man9.svg',
  '0m': 'Man5-Dora.svg',
  '1p': 'Pin1.svg',
  '2p': 'Pin2.svg',
  '3p': 'Pin3.svg',
  '4p': 'Pin4.svg',
  '5p': 'Pin5.svg',
  '6p': 'Pin6.svg',
  '7p': 'Pin7.svg',
  '8p': 'Pin8.svg',
  '9p': 'Pin9.svg',
  '0p': 'Pin5-Dora.svg',
  '1s': 'Sou1.svg',
  '2s': 'Sou2.svg',
  '3s': 'Sou3.svg',
  '4s': 'Sou4.svg',
  '5s': 'Sou5.svg',
  '6s': 'Sou6.svg',
  '7s': 'Sou7.svg',
  '8s': 'Sou8.svg',
  '9s': 'Sou9.svg',
  '0s': 'Sou5-Dora.svg',
  '1z': 'Ton.svg',
  '2z': 'Nan.svg',
  '3z': 'Shaa.svg',
  '4z': 'Pei.svg',
  '5z': 'Haku.svg',
  '6z': 'Hatsu.svg',
  '7z': 'Chun.svg',
};

/** 1 個の正規化済みテンプレート。 */
export interface NormalizedTemplate {
  code: TileCode;
  /** ゼロ平均・単位ノルム化された TEMPLATE_LEN 長の Float32Array。 */
  data: Float32Array;
}

/** Image を読み込んで Canvas に描画し RGBA を返す関数 (テストで差し替え可能)。 */
export interface TemplateLoader {
  load(url: string): Promise<{
    rgba: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
  }>;
}

/**
 * ブラウザ用の `TemplateLoader`。`<img>` を生成して `OffscreenCanvas` (or canvas) に描画する。
 */
export const createBrowserTemplateLoader = (): TemplateLoader => ({
  async load(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load template image: ${url}`));
      img.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
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
    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    return { rgba: data.data, width: w, height: h };
  },
});

/** テンプレート群をロードし、正規化テンプレートに変換する。 */
export const loadTemplates = async (
  loader: TemplateLoader,
  baseUrl = '/img/tiles/light/',
): Promise<NormalizedTemplate[]> => {
  const entries = Object.entries(TILE_TEMPLATE_FILES) as Array<[TileCode, string]>;
  const templates: NormalizedTemplate[] = [];
  for (const [code, file] of entries) {
    const { rgba, width, height } = await loader.load(`${baseUrl}${file}`);
    const gray = rgbaToGrayscale(rgba, width, height);
    const sized = resampleNearest(gray, width, height);
    if (sized.length !== TEMPLATE_LEN) {
      throw new Error(`Unexpected template size for ${code}`);
    }
    if (!normalize(sized)) {
      throw new Error(`Template image is uniform and cannot be normalized: ${code}`);
    }
    templates.push({ code, data: sized });
  }
  return templates;
};

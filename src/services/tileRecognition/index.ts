import type { TileCode } from '../../types/analysis';

/**
 * 牌画像認識エンジンの共通インターフェース。
 *
 * 実装は環境（オンデバイス CV / WebWorker / 将来的な ML モデル）に依存しないように
 * 入力を `Blob | ImageBitmap | HTMLImageElement` のいずれかで受け取る。
 */
export interface TileRecognizer {
  recognize(
    image: Blob | ImageBitmap | HTMLImageElement,
    options?: RecognizeOptions,
  ): Promise<RecognitionResult>;
}

export interface RecognizeOptions {
  /** 期待される牌枚数。ヒントとして使われる。 */
  expectedCount?: number;
  /** 認識処理の中止トークン (将来用)。 */
  signal?: AbortSignal;
}

export interface RecognitionResult {
  /**
   * 認識された牌の配列。X 座標で左から右に並ぶ。
   * `code` が `null` の要素は「未確定 (信頼度不足)」を意味する。
   */
  tiles: RecognizedTile[];
  /** デバッグ情報 (オプション) */
  debug?: Record<string, unknown>;
}

export interface RecognizedTile {
  code: TileCode | null;
  /** 0..1 の信頼度。null の場合は 0。 */
  confidence: number;
  /** 検出された矩形 (画像座標系)。テンプレートマッチでなければ undefined 可。 */
  bbox?: { x: number; y: number; width: number; height: number };
}

/**
 * 認識結果を 14 枚に正規化（不足は null パディング）する。
 */
export const padToCount = (tiles: RecognizedTile[], count: number): RecognizedTile[] => {
  const out = tiles.slice(0, count);
  while (out.length < count) {
    out.push({ code: null, confidence: 0 });
  }
  return out;
};

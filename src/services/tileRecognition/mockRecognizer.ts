import type { TileCode } from '../../types/analysis';
import type { RecognitionResult, RecognizeOptions, TileRecognizer } from './index';

/**
 * 開発・テスト用の固定結果を返す `TileRecognizer` 実装。
 *
 * 用途:
 * - UI 配線の動作確認（カメラ撮影・ファイル選択フロー）
 * - 認識アルゴリズムの実装が完成するまでの繋ぎ
 * - ユニットテスト時の差し込み
 */
export class MockTileRecognizer implements TileRecognizer {
  private readonly fixed: TileCode[];
  private readonly delayMs: number;

  constructor(fixed: TileCode[], delayMs = 0) {
    this.fixed = fixed;
    this.delayMs = delayMs;
  }

  async recognize(
    _image: Blob | ImageBitmap | HTMLImageElement,
    options?: RecognizeOptions,
  ): Promise<RecognitionResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    if (options?.signal?.aborted) {
      throw new DOMException('aborted', 'AbortError');
    }
    return {
      tiles: this.fixed.map((code) => ({ code, confidence: 1 })),
    };
  }
}

/**
 * デモ用のサンプル手牌（萬子123/筒子234/索子345/萬678/字南雀頭、和了牌 8m を含めた 14 枚）。
 */
export const DEMO_HAND: TileCode[] = [
  '1m',
  '2m',
  '3m',
  '2p',
  '3p',
  '4p',
  '3s',
  '4s',
  '5s',
  '6m',
  '7m',
  '8m',
  '2z',
  '2z',
];

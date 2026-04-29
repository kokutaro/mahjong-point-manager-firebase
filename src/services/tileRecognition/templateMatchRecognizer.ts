import type { RecognitionResult, TileRecognizer } from './index';

/**
 * テンプレートマッチング + 古典 CV による牌認識実装の **空骨格**。
 *
 * 現在は未実装で、`recognize` を呼ぶと `not-implemented` 例外を投げる。
 * 実装は以下を予定：
 *
 *   1. `public/img/tiles/` の正面画像を WebWorker 起動時にロードしてグレースケール正規化テンプレ化
 *   2. 入力画像を縮小・グレースケール化 → 適応的二値化 → 矩形候補抽出 (連結成分)
 *   3. 各候補を射影変換でテンプレートサイズに合わせ、NCC で最大スコアの牌を採用
 *   4. confidence 閾値以下は `code: null` を返す
 *
 * 詳細は `docs/tile-recognition-design.md` (将来作成予定) を参照。
 */
export class TemplateMatchRecognizer implements TileRecognizer {
  async recognize(): Promise<RecognitionResult> {
    throw new Error(
      'TemplateMatchRecognizer is not implemented yet. Use MockTileRecognizer for now.',
    );
  }
}

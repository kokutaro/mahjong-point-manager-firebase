import type { TileRecognizer } from './index';
import { DEMO_HAND, MockTileRecognizer } from './mockRecognizer';

/**
 * 環境変数や設定に応じて適切な `TileRecognizer` 実装を生成する。
 *
 * 現状はテンプレートマッチ実装が未完成のため、常に Mock を返す。
 * 実装が完了したら `import.meta.env.VITE_TILE_RECOGNIZER === 'template'` 等で切替予定。
 */
export const createTileRecognizer = (): TileRecognizer => {
  return new MockTileRecognizer(DEMO_HAND);
};

import type { TileRecognizer } from './index';
import { DEMO_HAND, MockTileRecognizer } from './mockRecognizer';
import { TfliteTileRecognizer } from './tfliteRecognizer';

/**
 * 環境変数や設定に応じて適切な `TileRecognizer` 実装を生成する。
 *
 * 切替仕様:
 *   - `import.meta.env.VITE_TILE_RECOGNIZER === 'tflite'` → `TfliteTileRecognizer`
 *   - `=== 'mock'` または未設定 → `MockTileRecognizer` (デフォルト)
 *
 * 詳細仕様は GitHub Issue #146 を参照。
 */
export const createTileRecognizer = (): TileRecognizer => {
  const mode = (import.meta.env?.VITE_TILE_RECOGNIZER ?? 'mock').toLowerCase();
  if (mode === 'tflite') {
    return new TfliteTileRecognizer();
  }
  return new MockTileRecognizer(DEMO_HAND);
};

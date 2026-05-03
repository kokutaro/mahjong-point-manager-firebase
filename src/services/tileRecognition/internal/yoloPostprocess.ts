import type { TileCode } from '../../../types/analysis';

/**
 * YOLOv8 系の物体検出出力を後処理して、認識牌のリストへ変換するためのユーティリティ。
 *
 * Roboflow からエクスポートされる YOLOv8 TFLite モデルは
 * 通常 `[1, 4 + numClasses, numAnchors]` (channels-first) または
 * `[1, numAnchors, 4 + numClasses]` (channels-last) のいずれかの形状を持つ。
 * どちらでも扱えるように、形状を見て自動的に判別する。
 *
 * 入力 (`predictions`) はモデル出力を `Float32Array` にフラット化したもの。
 * `shape` は `[1, A, B]` の形を想定する。
 */

export interface RawDetection {
  /** 中心 X (0..1, 入力画像幅基準) */
  cx: number;
  /** 中心 Y (0..1) */
  cy: number;
  /** 幅 (0..1) */
  w: number;
  /** 高さ (0..1) */
  h: number;
  /** 推定クラス index */
  classIndex: number;
  /** 0..1 のスコア */
  score: number;
}

export interface ParsedDetection extends RawDetection {
  /** 入力画像座標系での bbox (左上原点) */
  bbox: { x: number; y: number; width: number; height: number };
  /** TileCode (mapping 失敗時は null) */
  code: TileCode | null;
}

/**
 * YOLOv8 の生出力をパースして、信頼度しきい値を超えた候補のみを返す。
 *
 * @param predictions モデル出力 (フラット化した Float32Array)
 * @param shape       `[1, A, B]` 形状
 * @param scoreThreshold 0..1 のしきい値
 */
export const parseYoloOutput = (
  predictions: Float32Array,
  shape: readonly number[],
  scoreThreshold: number,
): RawDetection[] => {
  if (shape.length !== 3 || shape[0] !== 1) {
    throw new Error(`Unexpected YOLO output shape: ${JSON.stringify(shape)}`);
  }
  const [, dim1, dim2] = shape;
  // 4 + numClasses は最低でも 5 (1クラス想定) なので、小さい方をチャンネル次元と判定する。
  const channels = dim1 < dim2 ? dim1 : dim2;
  const anchors = dim1 < dim2 ? dim2 : dim1;
  const channelsFirst = dim1 < dim2;
  const numClasses = channels - 4;
  if (numClasses <= 0) {
    throw new Error(`Invalid YOLO output: channels=${channels}`);
  }

  const at = (channel: number, anchor: number): number =>
    channelsFirst
      ? predictions[channel * anchors + anchor]
      : predictions[anchor * channels + channel];

  const detections: RawDetection[] = [];
  for (let a = 0; a < anchors; a++) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let c = 0; c < numClasses; c++) {
      const s = at(4 + c, a);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = c;
      }
    }
    if (bestScore < scoreThreshold) continue;
    detections.push({
      cx: at(0, a),
      cy: at(1, a),
      w: at(2, a),
      h: at(3, a),
      classIndex: bestIdx,
      score: bestScore,
    });
  }
  return detections;
};

/**
 * シンプルな貪欲 NMS。スコア降順でソートし、IoU が閾値を超える後続候補を除外する。
 */
export const nonMaxSuppression = (
  detections: RawDetection[],
  iouThreshold: number,
): RawDetection[] => {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept: RawDetection[] = [];
  for (const d of sorted) {
    let suppressed = false;
    for (const k of kept) {
      if (iou(d, k) > iouThreshold) {
        suppressed = true;
        break;
      }
    }
    if (!suppressed) kept.push(d);
  }
  return kept;
};

const iou = (a: RawDetection, b: RawDetection): number => {
  const ax1 = a.cx - a.w / 2;
  const ay1 = a.cy - a.h / 2;
  const ax2 = a.cx + a.w / 2;
  const ay2 = a.cy + a.h / 2;
  const bx1 = b.cx - b.w / 2;
  const by1 = b.cy - b.h / 2;
  const bx2 = b.cx + b.w / 2;
  const by2 = b.cy + b.h / 2;
  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
};

/**
 * 検出結果に対して、入力画像サイズへの bbox 換算と TileCode マッピングを適用する。
 * X 中心座標で昇順にソートして返す (左から右に並んだ手牌として扱う)。
 */
export const finalizeDetections = (
  detections: RawDetection[],
  imageWidth: number,
  imageHeight: number,
  labelToTile: (idx: number) => TileCode | null,
): ParsedDetection[] => {
  return detections
    .map((d) => {
      const x = (d.cx - d.w / 2) * imageWidth;
      const y = (d.cy - d.h / 2) * imageHeight;
      const width = d.w * imageWidth;
      const height = d.h * imageHeight;
      return {
        ...d,
        bbox: { x, y, width, height },
        code: labelToTile(d.classIndex),
      } satisfies ParsedDetection;
    })
    .sort((a, b) => a.cx - b.cx);
};

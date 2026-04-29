import type { Meld, TileCode, Wind, YakuId, YakumanId } from '../../types/analysis';

/**
 * 自動点数計算エンジン (`judgeHand`) への入力。
 *
 * - `closedTiles` は手牌（門前部分の概念ではなく、副露を除く実際にプレイヤーが持っている牌）。
 *   和了牌を含めた合計枚数は 14 / 13+副露分 / 副露分を引いた残り などを正規化した状態で渡す。
 *   実装では「`closedTiles` + `melds` の総和 + 1 (winningTile)」が 14 に等しいことを前提とする。
 * - `winningTile` は和了牌そのもの。`closedTiles` には含めず別フィールドで渡す。
 * - `melds` は副露面子。空配列なら門前。
 * - 状況役 (`flags`) と `doraCount` / `akaDoraCount` は手動入力された値をそのまま使う。
 */
export interface HandInput {
  closedTiles: TileCode[];
  winningTile: TileCode;
  melds: Meld[];
  isTsumo: boolean;
  seatWind: Wind;
  roundWind: Wind;
  flags: HandFlags;
  doraCount: number;
  akaDoraCount: number;
}

export interface HandFlags {
  riichi: boolean;
  doubleRiichi: boolean;
  ippatsu: boolean;
  rinshan: boolean;
  chankan: boolean;
  haitei: boolean;
  houtei: boolean;
  tenho: boolean;
  chiho: boolean;
}

export const DEFAULT_HAND_FLAGS: HandFlags = {
  riichi: false,
  doubleRiichi: false,
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  houtei: false,
  tenho: false,
  chiho: false,
};

export type YakuEntryId =
  | YakuId
  | YakumanId
  | 'dora'
  | 'akaDora'
  | 'ippatsu'
  | 'rinshan'
  | 'chankan'
  | 'haitei'
  | 'houtei';

export interface YakuJudgeResultEntry {
  id: YakuEntryId;
  label: string;
  han: number;
  /** 役満なら倍数 (ダブル役満=2)、それ以外は undefined */
  yakumanMultiplier?: number;
}

export interface YakuJudgeResult {
  /** 検出された役一覧（順序: 役満優先 → 翻数降順）。役満があれば翻役は含まれない。 */
  yaku: YakuJudgeResultEntry[];
  /** 役満の場合は倍数（1=単役満, 2=ダブル, ...）。役満でなければ 0。 */
  yakumanMultiplier: number;
  /** 通常役の合計翻数 (ドラ/赤ドラ含む)。役満時は 0。 */
  han: number;
  /** 符 (役満時は便宜上 0)。 */
  fu: number;
  /** 入力検証や境界条件で発生した警告メッセージ。和了として扱えない場合もここに格納。 */
  warnings: string[];
  /** true の場合は `judgeHand` が和了形として認識できなかったことを意味する。 */
  isInvalid: boolean;
}

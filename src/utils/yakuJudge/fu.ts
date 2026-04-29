import type { TileCode, Wind } from '../../types/analysis';
import type { Mentsu, DecomposedHand } from './decompose';
import { parseTile, tileToIndex } from './tileUtils';

const WIND_TO_HONOR_INDEX: Record<Wind, number> = {
  East: 27, // 1z
  South: 28, // 2z
  West: 29, // 3z
  North: 30, // 4z
};
const DRAGON_INDICES = [31, 32, 33]; // 5z 白, 6z 發, 7z 中

/**
 * 標準形 (4面子1雀頭) の符を算出する。
 *
 * 計算手順:
 *   1. 副底 20 符
 *   2. 雀頭符 (役牌雀頭は +2)
 *   3. 各面子の符 (順子=0、刻子/槓子の暗明・幺九/中張・暗槓ボーナス)
 *   4. 待ち符 (カンチャン/ペンチャン/単騎=2、両面/シャボ=0)
 *   5. ツモ符 (門前ツモなら +2)
 *   6. ロン符 (門前ロンなら +10)
 *   7. 喰い平和形ロンは固定 30 符 (ロン10符が付かない & 全要素0)
 *   8. 切り上げ 10 符単位
 *
 * 平和ツモ (門前ツモ + 全順子 + 雀頭非役牌 + 両面待ち) は 20 符固定。
 */
export const calculateFu = (
  decomp: DecomposedHand,
  isTsumo: boolean,
  isMenzen: boolean,
  seatWind: Wind,
  roundWind: Wind,
): { fu: number; isPinfuShape: boolean } => {
  const isPinfuShape = checkPinfuShape(decomp, seatWind, roundWind);

  // 平和ツモ → 20 符
  if (isPinfuShape && isTsumo && isMenzen) {
    return { fu: 20, isPinfuShape };
  }

  // 喰い平和ロン (副露あり、全順子、雀頭非役牌、両面待ち) → 30 符固定
  const isOpenPinfuRon =
    !isMenzen &&
    !isTsumo &&
    decomp.mentsu.every((m) => m.kind === 'shuntsu') &&
    !isYakuhaiPair(decomp.pair, seatWind, roundWind) &&
    decomp.wait === 'ryanmen';
  if (isOpenPinfuRon) {
    return { fu: 30, isPinfuShape: false };
  }

  let fu = 20; // 副底

  // 雀頭符
  fu += pairFu(decomp.pair, seatWind, roundWind);

  // 各面子符
  for (const m of decomp.mentsu) {
    fu += mentsuFu(m);
  }

  // 待ち符
  if (decomp.wait === 'kanchan' || decomp.wait === 'penchan' || decomp.wait === 'tanki') {
    fu += 2;
  }

  // ツモ符
  if (isTsumo) {
    fu += 2;
  } else if (isMenzen) {
    // 門前ロン
    fu += 10;
  }

  // 副底のみで終わった場合 (副露・ロン・全順子・両面・非役牌雀頭) は通常 30 符に切り上げ
  // → 上の openPinfuRon 早期 return で扱い済み

  // 10 符単位切り上げ
  const ceiled = Math.ceil(fu / 10) * 10;
  return { fu: ceiled, isPinfuShape };
};

const pairFu = (pair: TileCode, seat: Wind, round: Wind): number => {
  const idx = tileToIndex(pair);
  const seatIdx = WIND_TO_HONOR_INDEX[seat];
  const roundIdx = WIND_TO_HONOR_INDEX[round];
  let fu = 0;
  if (idx === seatIdx) fu += 2;
  if (idx === roundIdx) fu += 2; // 連風牌は 4 符
  if (DRAGON_INDICES.includes(idx)) fu += 2;
  return fu;
};

const mentsuFu = (m: Mentsu): number => {
  if (m.kind === 'shuntsu') return 0;
  const headTile = parseTile(m.tiles[0]);
  const isYaochu = headTile.suit === 'z' || headTile.rank === 1 || headTile.rank === 9;
  if (m.kind === 'koutsu') {
    // 暗刻: 4 (中張) / 8 (幺九)
    // 明刻: 2 / 4
    if (m.isOpen) {
      return isYaochu ? 4 : 2;
    }
    return isYaochu ? 8 : 4;
  }
  // kantsu
  if (m.isAnkan) {
    return isYaochu ? 32 : 16;
  }
  // 明槓
  return isYaochu ? 16 : 8;
};

const isYakuhaiPair = (pair: TileCode, seat: Wind, round: Wind): boolean => {
  const idx = tileToIndex(pair);
  if (DRAGON_INDICES.includes(idx)) return true;
  if (idx === WIND_TO_HONOR_INDEX[seat]) return true;
  if (idx === WIND_TO_HONOR_INDEX[round]) return true;
  return false;
};

const checkPinfuShape = (decomp: DecomposedHand, seat: Wind, round: Wind): boolean => {
  if (decomp.mentsu.some((m) => m.kind !== 'shuntsu')) return false;
  if (decomp.mentsu.some((m) => m.isOpen)) return false;
  if (isYakuhaiPair(decomp.pair, seat, round)) return false;
  if (decomp.wait !== 'ryanmen') return false;
  return true;
};

import type { TileCode, Wind, YakuId, YakumanId } from '../../types/analysis';
import type { ChiitoitsuShape, DecomposedHand, KokushiShape, Mentsu } from './decompose';
import { isHonor, isTerminal, isTerminalOrHonor, parseTile, tileToIndex } from './tileUtils';

export interface DetectedYaku {
  id: YakuId;
  han: number;
}

export interface DetectedYakuman {
  id: YakumanId;
  multiplier: number;
}

const WIND_TO_HONOR_INDEX: Record<Wind, number> = {
  East: 27,
  South: 28,
  West: 29,
  North: 30,
};
const HAKU = 31;
const HATSU = 32;
const CHUN = 33;
const DRAGON_INDICES = [HAKU, HATSU, CHUN];
const ALL_WIND_INDICES = [27, 28, 29, 30];

export interface DetectContext {
  decomp: DecomposedHand;
  isMenzen: boolean;
  seatWind: Wind;
  roundWind: Wind;
}

/**
 * 標準形 (4面子1雀頭) からの役検出。役満を含む。
 * `chiitoitsu` / `kokushi` は別関数を使う。
 */
export const detectStandardYaku = (
  ctx: DetectContext,
): { yakuman: DetectedYakuman[]; yaku: DetectedYaku[] } => {
  const yakuman: DetectedYakuman[] = [];
  const yaku: DetectedYaku[] = [];

  const { decomp, isMenzen, seatWind, roundWind } = ctx;
  const all = allTiles(decomp);
  const allIndices = all.map(tileToIndex);
  const tiles = all.map(parseTile);

  // ---------- 役満 ----------
  // 字一色
  if (tiles.every(isHonor)) {
    yakuman.push({ id: 'tsuuiisou', multiplier: 1 });
  }
  // 清老頭
  if (tiles.every(isTerminal)) {
    yakuman.push({ id: 'chinroutou', multiplier: 1 });
  }
  // 緑一色 (索子の 2,3,4,6,8 と 發のみ)
  const greenIndices = new Set([
    19,
    20,
    21,
    23,
    25, // 2s..8s 該当のみ
    HATSU,
  ]);
  if (allIndices.every((i) => greenIndices.has(i))) {
    yakuman.push({ id: 'ryuuiisou', multiplier: 1 });
  }
  // 大三元
  if (DRAGON_INDICES.every((d) => isKoutsuOrKantsuOf(decomp, d))) {
    yakuman.push({ id: 'daisangen', multiplier: 1 });
  }
  // 小四喜 / 大四喜
  const windKantsuKoutsu = ALL_WIND_INDICES.filter((w) => isKoutsuOrKantsuOf(decomp, w));
  const pairIsWind = ALL_WIND_INDICES.includes(tileToIndex(decomp.pair));
  if (windKantsuKoutsu.length === 4) {
    yakuman.push({ id: 'daisuushii', multiplier: 2 });
  } else if (windKantsuKoutsu.length === 3 && pairIsWind) {
    yakuman.push({ id: 'shousuushii', multiplier: 1 });
  }
  // 四暗刻 / 四暗刻単騎
  const ankouCount =
    decomp.mentsu.filter((m) => m.kind === 'koutsu' && !m.isOpen).length +
    decomp.mentsu.filter((m) => m.kind === 'kantsu' && m.isAnkan).length;
  if (ankouCount === 4 && isMenzen) {
    if (decomp.wait === 'tanki') {
      yakuman.push({ id: 'suuankouTanki', multiplier: 2 });
    } else {
      yakuman.push({ id: 'suuankou', multiplier: 1 });
    }
  }
  // 四槓子
  if (decomp.mentsu.filter((m) => m.kind === 'kantsu').length === 4) {
    yakuman.push({ id: 'suukantsu', multiplier: 1 });
  }

  if (yakuman.length > 0) {
    return { yakuman, yaku: [] };
  }

  // ---------- 通常役 ----------
  // タンヤオ
  if (tiles.every((t) => !isTerminalOrHonor(t))) {
    yaku.push({ id: 'tanyao', han: 1 });
  }
  // 役牌
  for (const d of DRAGON_INDICES) {
    if (isKoutsuOrKantsuOf(decomp, d)) {
      const id = d === HAKU ? 'yakuhaiHaku' : d === HATSU ? 'yakuhaiHatsu' : 'yakuhaiChun';
      yaku.push({ id: id as YakuId, han: 1 });
    }
  }
  if (isKoutsuOrKantsuOf(decomp, WIND_TO_HONOR_INDEX[roundWind])) {
    yaku.push({ id: 'yakuhaiRoundWind', han: 1 });
  }
  if (isKoutsuOrKantsuOf(decomp, WIND_TO_HONOR_INDEX[seatWind])) {
    yaku.push({ id: 'yakuhaiSeatWind', han: 1 });
  }

  // 平和 (門前 + 全順子 + 雀頭非役牌 + 両面)
  if (
    isMenzen &&
    decomp.mentsu.every((m) => m.kind === 'shuntsu') &&
    decomp.wait === 'ryanmen' &&
    !isYakuhaiTile(tileToIndex(decomp.pair), seatWind, roundWind)
  ) {
    yaku.push({ id: 'pinfu', han: 1 });
  }

  // 一盃口 (門前) / 二盃口 (門前)
  if (isMenzen) {
    const ipei = countIdenticalShuntsu(decomp.mentsu);
    if (ipei === 2) {
      yaku.push({ id: 'ryanpeikou', han: 3 });
    } else if (ipei >= 1) {
      yaku.push({ id: 'iipeikou', han: 1 });
    }
  }

  // 三色同順
  if (hasSanshokuDoujun(decomp.mentsu)) {
    yaku.push({ id: 'sanshokuDoujun', han: isMenzen ? 2 : 1 });
  }

  // 三色同刻
  if (hasSanshokuDoukou(decomp.mentsu)) {
    yaku.push({ id: 'sanshokuDoukou', han: 2 });
  }

  // 一気通貫
  if (hasIkkitsuukan(decomp.mentsu)) {
    yaku.push({ id: 'ikkitsuukan', han: isMenzen ? 2 : 1 });
  }

  // 対々和
  if (decomp.mentsu.every((m) => m.kind === 'koutsu' || m.kind === 'kantsu')) {
    yaku.push({ id: 'toitoi', han: 2 });
  }

  // 三暗刻 (手の中の暗刻 = 暗刻 + 暗槓 が 3 つ)
  if (ankouCount === 3) {
    yaku.push({ id: 'sanankou', han: 2 });
  }

  // 三槓子
  if (decomp.mentsu.filter((m) => m.kind === 'kantsu').length === 3) {
    yaku.push({ id: 'sankantsu', han: 2 });
  }

  // 小三元
  const dragonKoutsuKantsuCount = DRAGON_INDICES.filter((d) =>
    isKoutsuOrKantsuOf(decomp, d),
  ).length;
  const pairIsDragon = DRAGON_INDICES.includes(tileToIndex(decomp.pair));
  if (dragonKoutsuKantsuCount === 2 && pairIsDragon) {
    yaku.push({ id: 'shousangen', han: 2 });
  }

  // 混老頭 (字牌+幺九のみ、対々または七対の形)
  if (tiles.every(isTerminalOrHonor) && tiles.some(isHonor) && tiles.some(isTerminal)) {
    yaku.push({ id: 'honroutou', han: 2 });
  }

  // 混全帯么九 / 純全帯么九
  if (allMentsuContainTerminalOrHonor(decomp)) {
    if (tiles.some(isHonor)) {
      // 字牌を含む場合は混全。ただし全幺九の場合は honroutou と重複する想定だが、
      // chanta は順子を必要とするので順子0の場合は付与しない
      const hasShuntsu = decomp.mentsu.some((m) => m.kind === 'shuntsu');
      if (hasShuntsu) yaku.push({ id: 'chanta', han: isMenzen ? 2 : 1 });
    } else {
      const hasShuntsu = decomp.mentsu.some((m) => m.kind === 'shuntsu');
      if (hasShuntsu) yaku.push({ id: 'junchan', han: isMenzen ? 3 : 2 });
    }
  }

  // 染め手 (一色)
  const suitsUsed = new Set(tiles.filter((t) => t.suit !== 'z').map((t) => t.suit));
  const hasHonorTile = tiles.some(isHonor);
  if (suitsUsed.size === 1 && !hasHonorTile) {
    yaku.push({ id: 'chinitsu', han: isMenzen ? 6 : 5 });
  } else if (suitsUsed.size === 1 && hasHonorTile) {
    yaku.push({ id: 'honitsu', han: isMenzen ? 3 : 2 });
  }

  return { yakuman, yaku };
};

/**
 * 七対子は専用ハンドラ。
 */
export const detectChiitoitsu = (
  shape: ChiitoitsuShape,
  ctx: { isMenzen: boolean },
): { yakuman: DetectedYakuman[]; yaku: DetectedYaku[] } => {
  if (!ctx.isMenzen) return { yakuman: [], yaku: [] };
  const yaku: DetectedYaku[] = [{ id: 'chiitoitsu', han: 2 }];
  const tiles = shape.pairs.map(parseTile);
  // タンヤオ
  if (tiles.every((t) => !isTerminalOrHonor(t))) {
    yaku.push({ id: 'tanyao', han: 1 });
  }
  // 字一色 (役満)
  if (tiles.every(isHonor)) {
    return { yakuman: [{ id: 'tsuuiisou', multiplier: 1 }], yaku: [] };
  }
  // 混老頭は対々または七対形のとき
  if (tiles.every(isTerminalOrHonor) && tiles.some(isHonor) && tiles.some(isTerminal)) {
    yaku.push({ id: 'honroutou', han: 2 });
  }
  // 染め手
  const suitsUsed = new Set(tiles.filter((t) => t.suit !== 'z').map((t) => t.suit));
  const hasHonorTile = tiles.some(isHonor);
  if (suitsUsed.size === 1 && !hasHonorTile) {
    yaku.push({ id: 'chinitsu', han: 6 });
  } else if (suitsUsed.size === 1 && hasHonorTile) {
    yaku.push({ id: 'honitsu', han: 3 });
  }
  return { yakuman: [], yaku };
};

/**
 * 国士無双。
 */
export const detectKokushi = (shape: KokushiShape): DetectedYakuman[] => {
  return shape.is13Wait
    ? [{ id: 'kokushiMusou13Wait', multiplier: 2 }]
    : [{ id: 'kokushiMusou', multiplier: 1 }];
};

// ---------- ヘルパー ----------

const allTiles = (decomp: DecomposedHand): TileCode[] => {
  const tiles: TileCode[] = [decomp.pair, decomp.pair];
  for (const m of decomp.mentsu) tiles.push(...m.tiles);
  return tiles;
};

const isKoutsuOrKantsuOf = (decomp: DecomposedHand, tileIndex: number): boolean =>
  decomp.mentsu.some(
    (m) => (m.kind === 'koutsu' || m.kind === 'kantsu') && tileToIndex(m.tiles[0]) === tileIndex,
  );

const isYakuhaiTile = (idx: number, seat: Wind, round: Wind): boolean =>
  DRAGON_INDICES.includes(idx) ||
  idx === WIND_TO_HONOR_INDEX[seat] ||
  idx === WIND_TO_HONOR_INDEX[round];

const countIdenticalShuntsu = (mentsu: Mentsu[]): number => {
  // 副露順子も同じ並びなら一盃口候補だが、副露を含むなら成立しない。
  // ここは isMenzen チェック後に呼ばれる前提。
  const counts = new Map<string, number>();
  for (const m of mentsu) {
    if (m.kind !== 'shuntsu') continue;
    const key = m.tiles.join(',');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let pairs = 0;
  for (const v of counts.values()) {
    if (v >= 2) pairs += 1;
  }
  return pairs;
};

const hasSanshokuDoujun = (mentsu: Mentsu[]): boolean => {
  const shuntsuByStartRank = new Map<number, Set<string>>();
  for (const m of mentsu) {
    if (m.kind !== 'shuntsu') continue;
    const head = parseTile(m.tiles[0]);
    if (head.suit === 'z') continue;
    const set = shuntsuByStartRank.get(head.rank) ?? new Set();
    set.add(head.suit);
    shuntsuByStartRank.set(head.rank, set);
  }
  for (const set of shuntsuByStartRank.values()) {
    if (set.has('m') && set.has('p') && set.has('s')) return true;
  }
  return false;
};

const hasSanshokuDoukou = (mentsu: Mentsu[]): boolean => {
  const koutsuByRank = new Map<number, Set<string>>();
  for (const m of mentsu) {
    if (m.kind !== 'koutsu' && m.kind !== 'kantsu') continue;
    const head = parseTile(m.tiles[0]);
    if (head.suit === 'z') continue;
    const set = koutsuByRank.get(head.rank) ?? new Set();
    set.add(head.suit);
    koutsuByRank.set(head.rank, set);
  }
  for (const set of koutsuByRank.values()) {
    if (set.has('m') && set.has('p') && set.has('s')) return true;
  }
  return false;
};

const hasIkkitsuukan = (mentsu: Mentsu[]): boolean => {
  const shuntsuBySuit = new Map<string, Set<number>>();
  for (const m of mentsu) {
    if (m.kind !== 'shuntsu') continue;
    const head = parseTile(m.tiles[0]);
    if (head.suit === 'z') continue;
    const set = shuntsuBySuit.get(head.suit) ?? new Set();
    set.add(head.rank);
    shuntsuBySuit.set(head.suit, set);
  }
  for (const set of shuntsuBySuit.values()) {
    if (set.has(1) && set.has(4) && set.has(7)) return true;
  }
  return false;
};

const allMentsuContainTerminalOrHonor = (decomp: DecomposedHand): boolean => {
  // 雀頭も幺九 or 字牌
  const pairTile = parseTile(decomp.pair);
  if (!isTerminalOrHonor(pairTile)) return false;
  for (const m of decomp.mentsu) {
    const tiles = m.tiles.map(parseTile);
    if (!tiles.some(isTerminalOrHonor)) return false;
  }
  return true;
};

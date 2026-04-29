import type { Meld, TileCode, WaitShape } from '../../types/analysis';
import { indexToTile, tileToIndex } from './tileUtils';

/**
 * 面子（手の中の3枚 or 4枚の組）。decompose 由来は副露起源を持たない。
 */
export interface Mentsu {
  /** 'shuntsu' = 順子, 'koutsu' = 刻子, 'kantsu' = 槓子 */
  kind: 'shuntsu' | 'koutsu' | 'kantsu';
  /** 構成牌（normalized）。順子は昇順。 */
  tiles: TileCode[];
  /** 副露由来か */
  isOpen: boolean;
  /** ankan は isOpen=false 扱い */
  isAnkan?: boolean;
}

export interface DecomposedHand {
  pair: TileCode;
  mentsu: Mentsu[];
  /** 和了牌の入った面子のインデックス。雀頭で和了 (単騎) の場合は -1。 */
  winningMentsuIndex: number;
  /** 待ち形 (符・平和判定用) */
  wait: WaitShape;
}

/**
 * 七対子の検出結果。
 */
export interface ChiitoitsuShape {
  kind: 'chiitoitsu';
  pairs: TileCode[];
}

/**
 * 国士無双の検出結果。
 */
export interface KokushiShape {
  kind: 'kokushi';
  /** 13面待ちかどうか */
  is13Wait: boolean;
}

const TERMINAL_HONOR_INDICES = [
  0,
  8, // 1m, 9m
  9,
  17, // 1p, 9p
  18,
  26, // 1s, 9s
  27,
  28,
  29,
  30,
  31,
  32,
  33, // 1z..7z
];

/**
 * 14 枚（closed + winning）から 4 面子 1 雀頭の分解候補を全列挙する。
 * 副露 (`melds`) は分解対象に含めず、構成済み面子としてそのまま付加する。
 */
export const decomposeStandard = (
  closedTiles: TileCode[],
  winningTile: TileCode,
  melds: Meld[],
  isTsumo: boolean,
): DecomposedHand[] => {
  const allClosed = [...closedTiles, winningTile];
  const hist = new Array(34).fill(0);
  for (const t of allClosed) hist[tileToIndex(t)] += 1;

  const expectedClosedSets = 4 - melds.length;
  if (expectedClosedSets < 0) return [];

  const winIdx = tileToIndex(winningTile);
  const meldMentsu: Mentsu[] = melds.map(meldToMentsu);

  const results: DecomposedHand[] = [];

  // try each pair
  for (let p = 0; p < 34; p++) {
    if (hist[p] < 2) continue;
    hist[p] -= 2;
    const sets = collectSets(hist, expectedClosedSets);
    for (const closedSets of sets) {
      const allMentsu = [...closedSets, ...meldMentsu];
      // どの面子に和了牌が含まれているか判定
      const { winningMentsuIndex, wait } = identifyWinning(closedSets, winIdx, p, isTsumo);
      results.push({
        pair: indexToTile(p),
        mentsu: allMentsu,
        winningMentsuIndex,
        wait,
      });
    }
    hist[p] += 2;
  }

  return dedupe(results);
};

/**
 * 七対子の分解判定。副露がある場合は不成立。
 */
export const decomposeChiitoitsu = (
  closedTiles: TileCode[],
  winningTile: TileCode,
  melds: Meld[],
): ChiitoitsuShape | null => {
  if (melds.length > 0) return null;
  const all = [...closedTiles, winningTile];
  if (all.length !== 14) return null;
  const hist = new Array(34).fill(0);
  for (const t of all) hist[tileToIndex(t)] += 1;
  const pairs: TileCode[] = [];
  for (let i = 0; i < 34; i++) {
    if (hist[i] === 0) continue;
    if (hist[i] !== 2) return null;
    pairs.push(indexToTile(i));
  }
  if (pairs.length !== 7) return null;
  return { kind: 'chiitoitsu', pairs };
};

/**
 * 国士無双の分解判定。副露がある場合は不成立。
 */
export const decomposeKokushi = (
  closedTiles: TileCode[],
  winningTile: TileCode,
  melds: Meld[],
): KokushiShape | null => {
  if (melds.length > 0) return null;
  const all = [...closedTiles, winningTile];
  if (all.length !== 14) return null;
  const hist = new Array(34).fill(0);
  for (const t of all) hist[tileToIndex(t)] += 1;
  for (let i = 0; i < 34; i++) {
    if (!TERMINAL_HONOR_INDICES.includes(i) && hist[i] > 0) return null;
  }
  let pairCount = 0;
  let pairIndex = -1;
  for (const idx of TERMINAL_HONOR_INDICES) {
    const c = hist[idx];
    if (c === 0) return null;
    if (c === 2) {
      pairCount += 1;
      pairIndex = idx;
    } else if (c !== 1) {
      return null;
    }
  }
  if (pairCount !== 1) return null;
  // 13面待ち判定: 和了牌が雀頭側でない（=単騎以外で完成）の場合
  const winIdx = tileToIndex(winningTile);
  const is13Wait = winIdx !== pairIndex;
  return { kind: 'kokushi', is13Wait };
};

const meldToMentsu = (m: Meld): Mentsu => {
  switch (m.kind) {
    case 'chi':
      return { kind: 'shuntsu', tiles: [...m.tiles].sort(sortTileCodes), isOpen: true };
    case 'pon':
      return { kind: 'koutsu', tiles: [...m.tiles], isOpen: true };
    case 'minkan':
    case 'kakan':
      return { kind: 'kantsu', tiles: [...m.tiles], isOpen: true };
    case 'ankan':
      return { kind: 'kantsu', tiles: [...m.tiles], isOpen: false, isAnkan: true };
  }
};

const sortTileCodes = (a: TileCode, b: TileCode): number => tileToIndex(a) - tileToIndex(b);

/**
 * ヒストグラムから残りすべての牌を `count` 個の面子（順子/刻子）として取り出す
 * 全パターンを返す。
 */
const collectSets = (hist: number[], count: number): Mentsu[][] => {
  if (count === 0) {
    if (hist.every((v) => v === 0)) return [[]];
    return [];
  }
  // 最初に残っている牌から面子を作る
  let i = 0;
  while (i < 34 && hist[i] === 0) i++;
  if (i >= 34) return [];

  const results: Mentsu[][] = [];

  // 刻子試行
  if (hist[i] >= 3) {
    hist[i] -= 3;
    const sub = collectSets(hist, count - 1);
    for (const s of sub) {
      results.push([
        { kind: 'koutsu', tiles: [indexToTile(i), indexToTile(i), indexToTile(i)], isOpen: false },
        ...s,
      ]);
    }
    hist[i] += 3;
  }

  // 順子試行 (字牌・8/9始まりは不可)
  if (i < 27) {
    const rankInSuit = i % 9;
    if (rankInSuit <= 6 && hist[i + 1] >= 1 && hist[i + 2] >= 1) {
      hist[i] -= 1;
      hist[i + 1] -= 1;
      hist[i + 2] -= 1;
      const sub = collectSets(hist, count - 1);
      for (const s of sub) {
        results.push([
          {
            kind: 'shuntsu',
            tiles: [indexToTile(i), indexToTile(i + 1), indexToTile(i + 2)],
            isOpen: false,
          },
          ...s,
        ]);
      }
      hist[i] += 1;
      hist[i + 1] += 1;
      hist[i + 2] += 1;
    }
  }

  return results;
};

const identifyWinning = (
  closedSets: Mentsu[],
  winIdx: number,
  pairIdx: number,
  isTsumo: boolean,
): { winningMentsuIndex: number; wait: WaitShape } => {
  // 単騎: 雀頭が和了牌
  if (pairIdx === winIdx) {
    return { winningMentsuIndex: -1, wait: 'tanki' };
  }
  for (let i = 0; i < closedSets.length; i++) {
    const m = closedSets[i];
    const indices = m.tiles.map(tileToIndex);
    if (!indices.includes(winIdx)) continue;
    if (m.kind === 'koutsu') {
      // ツモなら暗刻、ロンならシャボ待ちで明刻扱い
      return { winningMentsuIndex: i, wait: isTsumo ? 'shanpon' : 'shanpon' };
    }
    if (m.kind === 'shuntsu') {
      const [a, , c] = indices;
      // ペンチャン: 12+3 待ち or 7+89待ち
      if ((a === 0 || a === 9 || a === 18) && winIdx === c) {
        return { winningMentsuIndex: i, wait: 'penchan' };
      }
      if ((c === 8 || c === 17 || c === 26) && winIdx === a) {
        return { winningMentsuIndex: i, wait: 'penchan' };
      }
      // カンチャン: 中央
      if (winIdx === a + 1) {
        return { winningMentsuIndex: i, wait: 'kanchan' };
      }
      // 両面
      return { winningMentsuIndex: i, wait: 'ryanmen' };
    }
  }
  // 副露牌で和了は通常ありえないが、フォールバックで両面扱い
  return { winningMentsuIndex: -1, wait: 'ryanmen' };
};

/**
 * 同一の (pair, mentsu) 配置を重複除去するキーを生成。
 */
const dedupe = (list: DecomposedHand[]): DecomposedHand[] => {
  const seen = new Set<string>();
  const out: DecomposedHand[] = [];
  for (const d of list) {
    const key = `${d.pair}|${d.mentsu
      .map((m) => `${m.kind}:${m.tiles.join(',')}:${m.isOpen ? 'o' : 'c'}${m.isAnkan ? 'a' : ''}`)
      .sort()
      .join(';')}|w=${d.winningMentsuIndex}|s=${d.wait}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
};

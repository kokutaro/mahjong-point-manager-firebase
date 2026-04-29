import type { Meld, TileCode } from '../../types/analysis';

export type Suit = 'm' | 'p' | 's' | 'z';

export interface ParsedTile {
  /** 0-3: m / p / s / z */
  suit: Suit;
  /** 数牌は 1-9、字牌は 1-7。赤5は 5 として扱う。 */
  rank: number;
  /** 元のコード（赤判定用に保持） */
  original: TileCode;
  /** 赤5かどうか */
  isRed: boolean;
}

const TERMINAL_SUITS: Suit[] = ['m', 'p', 's'];

/**
 * "0m" -> { suit: 'm', rank: 5, isRed: true }
 */
export const parseTile = (code: TileCode): ParsedTile => {
  const suitChar = code[1] as Suit;
  const digit = Number(code[0]);
  if (suitChar === 'z') {
    return { suit: 'z', rank: digit, original: code, isRed: false };
  }
  if (digit === 0) {
    return { suit: suitChar, rank: 5, original: code, isRed: true };
  }
  return { suit: suitChar, rank: digit, original: code, isRed: false };
};

/**
 * 内部表現の牌を、正規化されたコード（赤を5に置換）に戻す。
 */
export const normalizeCode = (code: TileCode): TileCode => {
  switch (code) {
    case '0m':
      return '5m';
    case '0p':
      return '5p';
    case '0s':
      return '5s';
    default:
      return code;
  }
};

export const normalizeTiles = (codes: TileCode[]): TileCode[] => codes.map(normalizeCode);

export const isTerminalOrHonor = (tile: ParsedTile): boolean => {
  if (tile.suit === 'z') return true;
  return tile.rank === 1 || tile.rank === 9;
};

export const isHonor = (tile: ParsedTile): boolean => tile.suit === 'z';
export const isTerminal = (tile: ParsedTile): boolean =>
  TERMINAL_SUITS.includes(tile.suit) && (tile.rank === 1 || tile.rank === 9);

export const tileEquals = (a: ParsedTile, b: ParsedTile): boolean =>
  a.suit === b.suit && a.rank === b.rank;

/**
 * 牌コード配列を 34 種ヒストグラム (m1..m9 p1..p9 s1..s9 z1..z7) に変換。
 * 赤5は通常5として加算。
 */
export const toHistogram = (codes: TileCode[]): number[] => {
  const hist = new Array(34).fill(0);
  for (const code of codes) {
    hist[tileToIndex(code)] += 1;
  }
  return hist;
};

export const tileToIndex = (code: TileCode): number => {
  const t = parseTile(code);
  if (t.suit === 'm') return t.rank - 1;
  if (t.suit === 'p') return 9 + (t.rank - 1);
  if (t.suit === 's') return 18 + (t.rank - 1);
  return 27 + (t.rank - 1);
};

export const indexToTile = (index: number): TileCode => {
  if (index < 9) return `${index + 1}m` as TileCode;
  if (index < 18) return `${index - 9 + 1}p` as TileCode;
  if (index < 27) return `${index - 18 + 1}s` as TileCode;
  return `${index - 27 + 1}z` as TileCode;
};

/**
 * 副露面子から 34 種ヒストグラムへ加算したものを返す。
 */
export const meldsToHistogram = (melds: Meld[]): number[] => {
  const hist = new Array(34).fill(0);
  for (const m of melds) {
    for (const t of m.tiles) {
      hist[tileToIndex(t)] += 1;
    }
  }
  return hist;
};

/**
 * 副露面子をすべて展開した牌コード配列。
 */
export const meldsToTiles = (melds: Meld[]): TileCode[] => melds.flatMap((m) => m.tiles);

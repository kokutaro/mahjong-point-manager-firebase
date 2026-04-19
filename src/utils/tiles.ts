import type { Meld, TileCode } from '../types/analysis';

export type TileGroupId = 'manzu' | 'pinzu' | 'souzu' | 'honor';
export type TileFaceSymbol = '萬' | '筒' | '索' | '東' | '南' | '西' | '北' | '白' | '發' | '中';
export type TileTheme = 'light' | 'dark';

export interface TileImageAssetPaths {
  frontPath: string;
  facePath: string;
}

export interface TilePalette {
  id: TileGroupId;
  label: string;
  accentColor: string;
  textColor: string;
  shadowColor: string;
}

export interface TileGroupDefinition {
  id: TileGroupId;
  label: string;
  tiles: TileCode[];
  palette: TilePalette;
}

export interface TileMetadata {
  code: TileCode;
  normalizedCode: TileCode;
  group: TileGroupId;
  palette: TilePalette;
  label: string;
  shortLabel: string;
  symbol: TileFaceSymbol;
  rank: number;
  rankLabel: string;
  isHonor: boolean;
  isRed: boolean;
}

const SUIT_TILE_RANKS = ['1', '2', '3', '4', '5', '0', '6', '7', '8', '9'] as const;
const HONOR_TILE_RANKS = ['1', '2', '3', '4', '5', '6', '7'] as const;
const TILE_CODE_PATTERN = /^(?:[1-9][mps]|[1-7]z|0[mps])$/;
const RED_FIVE_MAP: Record<'0m' | '0p' | '0s', '5m' | '5p' | '5s'> = {
  '0m': '5m',
  '0p': '5p',
  '0s': '5s',
};

const SUIT_SYMBOLS: Record<'m' | 'p' | 's', Extract<TileFaceSymbol, '萬' | '筒' | '索'>> = {
  m: '萬',
  p: '筒',
  s: '索',
};

const GROUP_FROM_SUIT: Record<'m' | 'p' | 's' | 'z', TileGroupId> = {
  m: 'manzu',
  p: 'pinzu',
  s: 'souzu',
  z: 'honor',
};

const HONOR_LABELS: Record<
  Extract<TileCode, `${number}z`>,
  Extract<TileFaceSymbol, '東' | '南' | '西' | '北' | '白' | '發' | '中'>
> = {
  '1z': '東',
  '2z': '南',
  '3z': '西',
  '4z': '北',
  '5z': '白',
  '6z': '發',
  '7z': '中',
};

const createSuitTiles = (suit: 'm' | 'p' | 's'): TileCode[] => {
  return SUIT_TILE_RANKS.map((rank) => `${rank}${suit}` as TileCode);
};

const MANZU_TILES = createSuitTiles('m');
const PINZU_TILES = createSuitTiles('p');
const SOUZU_TILES = createSuitTiles('s');
const HONOR_TILES = HONOR_TILE_RANKS.map((rank) => `${rank}z` as TileCode);

export const TILE_CODES: TileCode[] = [
  ...MANZU_TILES,
  ...PINZU_TILES,
  ...SOUZU_TILES,
  ...HONOR_TILES,
];

export const TILE_PALETTES: Record<TileGroupId, TilePalette> = {
  manzu: {
    id: 'manzu',
    label: '萬子',
    accentColor: 'var(--color-danger)',
    textColor: 'var(--color-danger)',
    shadowColor: 'var(--color-bg-main)',
  },
  pinzu: {
    id: 'pinzu',
    label: '筒子',
    accentColor: 'var(--color-info)',
    textColor: 'var(--color-info)',
    shadowColor: 'var(--color-bg-main)',
  },
  souzu: {
    id: 'souzu',
    label: '索子',
    accentColor: 'var(--color-success)',
    textColor: 'var(--color-success)',
    shadowColor: 'var(--color-bg-main)',
  },
  honor: {
    id: 'honor',
    label: '字牌',
    accentColor: 'var(--color-text-secondary)',
    textColor: 'var(--color-bg-main)',
    shadowColor: 'var(--color-bg-main)',
  },
};

export const TILE_GROUPS: TileGroupDefinition[] = [
  {
    id: 'manzu',
    label: '萬子',
    tiles: MANZU_TILES,
    palette: TILE_PALETTES.manzu,
  },
  {
    id: 'pinzu',
    label: '筒子',
    tiles: PINZU_TILES,
    palette: TILE_PALETTES.pinzu,
  },
  {
    id: 'souzu',
    label: '索子',
    tiles: SOUZU_TILES,
    palette: TILE_PALETTES.souzu,
  },
  {
    id: 'honor',
    label: '字牌',
    tiles: HONOR_TILES,
    palette: TILE_PALETTES.honor,
  },
];

export const isTileCode = (value: unknown): value is TileCode => {
  return typeof value === 'string' && TILE_CODE_PATTERN.test(value);
};

export const isRedFive = (tileCode: TileCode): boolean => {
  return tileCode === '0m' || tileCode === '0p' || tileCode === '0s';
};

export const normalizeTileCode = (tileCode: TileCode): TileCode => {
  switch (tileCode) {
    case '0m':
    case '0p':
    case '0s':
      return RED_FIVE_MAP[tileCode];
    default:
      return tileCode;
  }
};

export const getTileGroup = (tileCode: TileCode): TileGroupId => {
  const normalizedCode = normalizeTileCode(tileCode);
  const suit = normalizedCode[1] as 'm' | 'p' | 's' | 'z';
  return GROUP_FROM_SUIT[suit];
};

const getTileRank = (tileCode: TileCode): number => {
  const normalizedCode = normalizeTileCode(tileCode);
  return Number.parseInt(normalizedCode[0], 10);
};

const getTileSymbol = (tileCode: TileCode): TileFaceSymbol => {
  const normalizedCode = normalizeTileCode(tileCode);

  if (normalizedCode.endsWith('z')) {
    return HONOR_LABELS[normalizedCode as Extract<TileCode, `${number}z`>];
  }

  return SUIT_SYMBOLS[normalizedCode[1] as 'm' | 'p' | 's'];
};

export const getTileLabel = (tileCode: TileCode): string => {
  if (tileCode.endsWith('z')) {
    return HONOR_LABELS[tileCode as Extract<TileCode, `${number}z`>];
  }

  const normalizedCode = normalizeTileCode(tileCode);
  const symbol = SUIT_SYMBOLS[normalizedCode[1] as 'm' | 'p' | 's'];
  const rank = normalizedCode[0];

  return `${isRedFive(tileCode) ? '赤' : ''}${rank}${symbol}`;
};

export const getTileMetadata = (tileCode: TileCode): TileMetadata => {
  const normalizedCode = normalizeTileCode(tileCode);
  const group = getTileGroup(tileCode);
  const rank = getTileRank(tileCode);
  const isHonor = normalizedCode.endsWith('z');

  return {
    code: tileCode,
    normalizedCode,
    group,
    palette: TILE_PALETTES[group],
    label: getTileLabel(tileCode),
    shortLabel: isHonor ? getTileLabel(tileCode) : `${rank}${getTileSymbol(tileCode)}`,
    symbol: getTileSymbol(tileCode),
    rank,
    rankLabel: String(rank),
    isHonor,
    isRed: isRedFive(tileCode),
  };
};

const createRepeatedTiles = (tileCode: TileCode, count: 3 | 4): TileCode[] => {
  const normalizedCode = normalizeTileCode(tileCode);

  if (!isRedFive(tileCode)) {
    return Array.from({ length: count }, () => normalizedCode);
  }

  return [tileCode, ...Array.from({ length: count - 1 }, () => normalizedCode)];
};

const createChiTiles = (tileCode: TileCode): [TileCode, TileCode, TileCode] => {
  const normalizedCode = normalizeTileCode(tileCode);

  if (normalizedCode.endsWith('z')) {
    throw new Error('Chi meld cannot be created from an honor tile');
  }

  const suit = normalizedCode[1] as 'm' | 'p' | 's';
  const rank = getTileRank(tileCode);
  const start = Math.min(Math.max(rank - 1, 1), 7);

  return [
    `${start}${suit}` as TileCode,
    `${start + 1}${suit}` as TileCode,
    `${start + 2}${suit}` as TileCode,
  ];
};

export const createMeldDraft = (kind: Meld['kind'], tileCode: TileCode = '1m'): Meld => {
  switch (kind) {
    case 'chi':
      return {
        kind: 'chi',
        from: 'kamicha',
        tiles: createChiTiles(tileCode),
      };
    case 'pon':
      return {
        kind: 'pon',
        from: 'toimen',
        tiles: createRepeatedTiles(tileCode, 3) as [TileCode, TileCode, TileCode],
      };
    case 'minkan':
      return {
        kind: 'minkan',
        from: 'toimen',
        tiles: createRepeatedTiles(tileCode, 4) as [TileCode, TileCode, TileCode, TileCode],
      };
    case 'kakan':
      return {
        kind: 'kakan',
        from: 'toimen',
        tiles: createRepeatedTiles(tileCode, 4) as [TileCode, TileCode, TileCode, TileCode],
      };
    case 'ankan':
      return {
        kind: 'ankan',
        tiles: createRepeatedTiles(tileCode, 4) as [TileCode, TileCode, TileCode, TileCode],
      };
  }
};

const HONOR_SVG_NAMES: Record<string, string> = {
  '1z': 'Ton',
  '2z': 'Nan',
  '3z': 'Shaa',
  '4z': 'Pei',
  '5z': 'Haku',
  '6z': 'Hatsu',
  '7z': 'Chun',
};

const SUIT_SVG_PREFIX: Record<string, string> = {
  m: 'Man',
  p: 'Pin',
  s: 'Sou',
};

export const getTileSvgPath = (tileCode: TileCode, theme: TileTheme = 'light'): string => {
  if (tileCode.endsWith('z')) {
    const name = HONOR_SVG_NAMES[tileCode];
    return `/img/tiles/${theme}/${name}.svg`;
  }

  if (isRedFive(tileCode)) {
    const suit = tileCode[1] as 'm' | 'p' | 's';
    const prefix = SUIT_SVG_PREFIX[suit];
    return `/img/tiles/${theme}/${prefix}5-Dora.svg`;
  }

  const rank = tileCode[0];
  const suit = tileCode[1] as 'm' | 'p' | 's';
  const prefix = SUIT_SVG_PREFIX[suit];
  return `/img/tiles/${theme}/${prefix}${rank}.svg`;
};

export const getTileImageAssetPaths = (
  tileCode: TileCode,
  theme: TileTheme = 'light',
): TileImageAssetPaths => {
  return {
    frontPath: `/img/tiles/${theme}/Front.svg`,
    facePath: getTileSvgPath(tileCode, theme),
  };
};

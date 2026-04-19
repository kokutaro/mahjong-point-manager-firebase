import type {
  CallFromSymbol,
  HandNotationString,
  Meld,
  ParsedHand,
  ParsedRon,
  RelativePosition,
  TileCode,
} from '../types/analysis';

export interface ParseSuccess {
  success: true;
  hand: ParsedHand;
}

export interface ParseError {
  success: false;
  error: { message: string; position: number };
}

export type ParseResult = ParseSuccess | ParseError;

type Suit = 'm' | 'p' | 's' | 'z';
const SUITS = new Set<string>(['m', 'p', 's', 'z']);
const CALL_FROM_SYMBOLS = new Set<string>(['-', '=', '+']);

const CALL_FROM_MAP: Record<CallFromSymbol, RelativePosition> = {
  '-': 'shimocha',
  '=': 'toimen',
  '+': 'kamicha',
};

const REVERSE_CALL_FROM_MAP: Record<RelativePosition, CallFromSymbol> = {
  shimocha: '-',
  toimen: '=',
  kamicha: '+',
};

export const mapCallFromSymbol = (sym: CallFromSymbol): RelativePosition => {
  return CALL_FROM_MAP[sym];
};

const isValidDigitForSuit = (digit: number, suit: Suit): boolean => {
  if (suit === 'z') {
    return digit >= 1 && digit <= 7;
  }
  return digit >= 1 && digit <= 9;
};

const toTileCode = (suit: Suit, digit: number, isRed: boolean): TileCode => {
  if (isRed) {
    return `0${suit}` as TileCode;
  }
  return `${digit}${suit}` as TileCode;
};

interface ParsedTile {
  code: TileCode;
  isRed: boolean;
}

const parseTilesFromDigits = (
  suit: Suit,
  digitStr: string,
  basePosition: number,
): { tiles: ParsedTile[]; consumed: number } | ParseError => {
  const tiles: ParsedTile[] = [];
  let i = 0;

  while (i < digitStr.length) {
    const char = digitStr[i];
    const digit = Number.parseInt(char, 10);

    if (Number.isNaN(digit)) {
      break;
    }

    if (digit === 0) {
      return {
        success: false,
        error: {
          message: `0 は無効です。赤5は "5r" で表記してください`,
          position: basePosition + i,
        },
      };
    }

    if (!isValidDigitForSuit(digit, suit)) {
      return {
        success: false,
        error: {
          message: `${suit}${digit} は無効な牌コードです`,
          position: basePosition + i,
        },
      };
    }

    const isRed = digit === 5 && suit !== 'z' && i + 1 < digitStr.length && digitStr[i + 1] === 'r';
    tiles.push({ code: toTileCode(suit, digit, isRed), isRed });
    i += isRed ? 2 : 1;
  }

  return { tiles, consumed: i };
};

interface HandBlockResult {
  concealed: TileCode[];
  tsumo?: TileCode;
  ron?: ParsedRon;
}

const parseHandBlock = (block: string, blockPosition: number): HandBlockResult | ParseError => {
  const concealed: TileCode[] = [];
  let i = 0;

  while (i < block.length) {
    const char = block[i];

    if (!SUITS.has(char)) {
      return {
        success: false,
        error: {
          message: `予期しない文字 "${char}" が見つかりました`,
          position: blockPosition + i,
        },
      };
    }

    const suit = char as Suit;
    i += 1;

    const remaining = block.slice(i);
    const result = parseTilesFromDigits(suit, remaining, blockPosition + i);

    if ('success' in result && !result.success) {
      return result;
    }

    if (!('tiles' in result) || result.tiles.length === 0) {
      return {
        success: false,
        error: {
          message: `スーツ記号 "${suit}" の後に数字がありません`,
          position: blockPosition + i,
        },
      };
    }

    const { tiles, consumed } = result;
    i += consumed;

    const afterDigits = block.slice(i);

    if (afterDigits.startsWith('_')) {
      const lastTile = tiles[tiles.length - 1];
      for (const tile of tiles.slice(0, -1)) {
        concealed.push(tile.code);
      }
      i += 1;
      return { concealed, tsumo: lastTile.code };
    }

    if (afterDigits.length > 0 && CALL_FROM_SYMBOLS.has(afterDigits[0])) {
      const nextAfter = block.slice(i + 1);
      const hasMoreSuit = nextAfter.length > 0 && SUITS.has(nextAfter[0]);

      if (!hasMoreSuit) {
        const lastTile = tiles[tiles.length - 1];
        const from = mapCallFromSymbol(afterDigits[0] as CallFromSymbol);
        for (const tile of tiles.slice(0, -1)) {
          concealed.push(tile.code);
        }
        i += 1;
        return { concealed, ron: { tile: lastTile.code, from } };
      }
    }

    for (const tile of tiles) {
      concealed.push(tile.code);
    }
  }

  return { concealed };
};

const isSequentialTiles = (tiles: TileCode[]): boolean => {
  if (tiles.length !== 3) return false;

  const suit = tiles[0][1];
  if (suit === 'z') return false;
  if (!tiles.every((t) => t[1] === suit || (t[0] === '0' && t[1] === suit))) return false;

  const ranks = tiles
    .map((t) => (t[0] === '0' ? 5 : Number.parseInt(t[0], 10)))
    .sort((a, b) => a - b);

  return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
};

const areSameKindTiles = (tiles: TileCode[]): boolean => {
  if (tiles.length === 0) return false;
  const normalize = (t: TileCode): string => {
    if (t[0] === '0') return `5${t[1]}`;
    return t as string;
  };
  const first = normalize(tiles[0]);
  return tiles.every((t) => normalize(t) === first);
};

const parseMeldBlock = (block: string, blockPosition: number): Meld | ParseError => {
  let i = 0;
  const char = block[i];

  if (!SUITS.has(char)) {
    return {
      success: false,
      error: {
        message: `予期しない文字 "${char}" が見つかりました`,
        position: blockPosition + i,
      },
    };
  }

  const suit = char as Suit;
  i += 1;

  const remaining = block.slice(i);
  const tileResult = parseTilesFromDigits(suit, remaining, blockPosition + i);

  if ('success' in tileResult && !tileResult.success) {
    return tileResult;
  }

  if (!('tiles' in tileResult) || tileResult.tiles.length === 0) {
    return {
      success: false,
      error: {
        message: `スーツ記号 "${suit}" の後に数字がありません`,
        position: blockPosition + i,
      },
    };
  }

  const { tiles, consumed } = tileResult;
  i += consumed;

  const afterPart = block.slice(i);
  const tileCodes = tiles.map((t) => t.code);

  if (tiles.length === 3 && afterPart.length > 0 && CALL_FROM_SYMBOLS.has(afterPart[0])) {
    const from = mapCallFromSymbol(afterPart[0] as CallFromSymbol);
    const afterFrom = afterPart.slice(1);

    if (afterFrom.length > 0) {
      const extraDigit = Number.parseInt(afterFrom[0], 10);
      if (!Number.isNaN(extraDigit) && afterFrom.length === 1) {
        const extraIsRed =
          extraDigit === 5 && suit !== 'z' && afterFrom.length > 1 && afterFrom[1] === 'r';
        const extraCode = toTileCode(suit, extraDigit, extraIsRed);
        return {
          kind: 'kakan',
          tiles: [...tileCodes, extraCode] as [TileCode, TileCode, TileCode, TileCode],
          from,
        };
      }
    }

    if (isSequentialTiles(tileCodes)) {
      return {
        kind: 'chi',
        tiles: tileCodes as [TileCode, TileCode, TileCode],
        from: 'kamicha',
      };
    }

    if (areSameKindTiles(tileCodes)) {
      return {
        kind: 'pon',
        tiles: tileCodes as [TileCode, TileCode, TileCode],
        from,
      };
    }

    return {
      success: false,
      error: {
        message: '3枚の牌がチーにもポンにも該当しません',
        position: blockPosition,
      },
    };
  }

  if (tiles.length === 4) {
    if (!areSameKindTiles(tileCodes)) {
      return {
        success: false,
        error: {
          message: '4枚の牌が同一種ではありません',
          position: blockPosition,
        },
      };
    }

    if (afterPart.length > 0 && CALL_FROM_SYMBOLS.has(afterPart[0])) {
      const from = mapCallFromSymbol(afterPart[0] as CallFromSymbol);
      return {
        kind: 'minkan',
        tiles: tileCodes as [TileCode, TileCode, TileCode, TileCode],
        from,
      };
    }

    return {
      kind: 'ankan',
      tiles: tileCodes as [TileCode, TileCode, TileCode, TileCode],
    };
  }

  return {
    success: false,
    error: {
      message: '鳴きブロックの形式が不正です',
      position: blockPosition,
    },
  };
};

export const parseHandNotation = (input: string): ParseResult => {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return {
      success: false,
      error: { message: '入力が空です', position: 0 },
    };
  }

  const blocks = trimmed.split(',');
  const handBlockStr = blocks[0];

  const handResult = parseHandBlock(handBlockStr, 0);
  if ('success' in handResult && !handResult.success) {
    return handResult;
  }

  const { concealed, tsumo, ron } = handResult as HandBlockResult;

  const melds: Meld[] = [];
  let offset = handBlockStr.length + 1;

  for (let idx = 1; idx < blocks.length; idx++) {
    const meldBlock = blocks[idx];
    const meldResult = parseMeldBlock(meldBlock, offset);

    if ('success' in meldResult && !meldResult.success) {
      return meldResult;
    }

    melds.push(meldResult as Meld);
    offset += meldBlock.length + 1;
  }

  const hand: ParsedHand = { concealed, melds };
  if (tsumo !== undefined) {
    hand.tsumo = tsumo;
  }
  if (ron !== undefined) {
    hand.ron = ron;
  }

  return { success: true, hand };
};

const SUIT_ORDER: Suit[] = ['m', 'p', 's', 'z'];

const getSuit = (code: TileCode): Suit => {
  if (code[0] === '0') return code[1] as Suit;
  return code[code.length - 1] as Suit;
};

const getDigitStr = (code: TileCode): string => {
  if (code[0] === '0') return '5r';
  return code[0];
};

const tilesToNotation = (tiles: TileCode[]): string => {
  const bySuit = new Map<Suit, string[]>();
  for (const suit of SUIT_ORDER) {
    bySuit.set(suit, []);
  }

  for (const tile of tiles) {
    const suit = getSuit(tile);
    bySuit.get(suit)!.push(getDigitStr(tile));
  }

  let result = '';
  for (const suit of SUIT_ORDER) {
    const digits = bySuit.get(suit)!;
    if (digits.length > 0) {
      result += suit + digits.join('');
    }
  }

  return result;
};

const formatMeld = (meld: Meld): string => {
  const tiles = meld.tiles;
  const suit = getSuit(tiles[0]);

  switch (meld.kind) {
    case 'chi': {
      const digits = tiles.map(getDigitStr).join('');
      return `${suit}${digits}-`;
    }
    case 'pon': {
      const digits = tiles.map(getDigitStr).join('');
      return `${suit}${digits}${REVERSE_CALL_FROM_MAP[meld.from]}`;
    }
    case 'minkan': {
      const digits = tiles.map(getDigitStr).join('');
      return `${suit}${digits}${REVERSE_CALL_FROM_MAP[meld.from]}`;
    }
    case 'kakan': {
      const firstThree = tiles.slice(0, 3).map(getDigitStr).join('');
      const lastOne = getDigitStr(meld.tiles[3]);
      return `${suit}${firstThree}${REVERSE_CALL_FROM_MAP[meld.from]}${lastOne}`;
    }
    case 'ankan': {
      const digits = tiles.map(getDigitStr).join('');
      return `${suit}${digits}`;
    }
  }
};

export const formatHandNotation = (hand: ParsedHand): HandNotationString => {
  const allConcealed = [...hand.concealed];
  if (hand.ron) {
    allConcealed.push(hand.ron.tile);
  }
  if (hand.tsumo) {
    allConcealed.push(hand.tsumo);
  }

  let handPart = tilesToNotation(allConcealed);

  if (hand.tsumo) {
    handPart += '_';
  }
  if (hand.ron) {
    handPart += REVERSE_CALL_FROM_MAP[hand.ron.from];
  }

  const parts = [handPart];
  for (const meld of hand.melds) {
    parts.push(formatMeld(meld));
  }

  return parts.join(',') as HandNotationString;
};

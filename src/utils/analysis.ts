import type { HandLog, Player } from '../types';
import type {
  AnalysisEntry,
  AnalysisEventType,
  AnalysisSource,
  Meld,
  RelativePosition,
  TileCode,
  WaitShape,
  YakumanId,
  YakuId,
} from '../types/analysis';
import { WAIT_SHAPE_DEFS, YAKUMAN_DEFS, YAKU_DEFS } from '../types/analysis';
import { normalizeTileCode } from './tiles';

const TILE_CODE_PATTERN = /^(?:[1-9][mps]|[1-7]z|0[mps])$/;
const RELATIVE_POSITIONS: RelativePosition[] = ['kamicha', 'toimen', 'shimocha'];

const parseNonNegativeInteger = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
};

const parsePositiveInteger = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : undefined;
};

const isTileCode = (value: unknown): value is TileCode => {
  return typeof value === 'string' && TILE_CODE_PATTERN.test(value);
};

const isRelativePosition = (value: unknown): value is RelativePosition => {
  return typeof value === 'string' && RELATIVE_POSITIONS.includes(value as RelativePosition);
};

const isWaitShape = (value: unknown): value is WaitShape => {
  return typeof value === 'string' && value in WAIT_SHAPE_DEFS;
};

const isYakuId = (value: unknown): value is YakuId => {
  return typeof value === 'string' && value in YAKU_DEFS;
};

const isYakumanId = (value: unknown): value is YakumanId => {
  return typeof value === 'string' && value in YAKUMAN_DEFS;
};

const unique = <T>(values: T[]): T[] => {
  return [...new Set(values)];
};

const normalizeTileCodes = (tiles: TileCode[] | undefined): TileCode[] => {
  return (tiles ?? []).filter(isTileCode);
};

const areSameTileKinds = (tiles: TileCode[]): boolean => {
  if (tiles.length === 0) {
    return false;
  }

  const [firstTile, ...restTiles] = tiles.map(normalizeTileCode);
  return restTiles.every((tile) => tile === firstTile);
};

const isValidChi = (tiles: [TileCode, TileCode, TileCode]): boolean => {
  const normalizedTiles = tiles.map(normalizeTileCode);
  if (normalizedTiles.some((tile) => tile.endsWith('z'))) {
    return false;
  }

  const suit = normalizedTiles[0][1];
  if (!normalizedTiles.every((tile) => tile[1] === suit)) {
    return false;
  }

  const ranks = normalizedTiles
    .map((tile) => Number.parseInt(tile[0], 10))
    .sort((left, right) => left - right);

  return ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
};

const normalizeMeld = (meld: Meld): Meld | null => {
  switch (meld.kind) {
    case 'chi':
      return meld.tiles.length === 3 &&
        meld.tiles.every(isTileCode) &&
        meld.from === 'kamicha' &&
        isValidChi(meld.tiles)
        ? { ...meld, tiles: [...meld.tiles] as [TileCode, TileCode, TileCode] }
        : null;
    case 'pon':
      return meld.tiles.length === 3 &&
        meld.tiles.every(isTileCode) &&
        isRelativePosition(meld.from) &&
        areSameTileKinds(meld.tiles)
        ? { ...meld, tiles: [...meld.tiles] as [TileCode, TileCode, TileCode] }
        : null;
    case 'minkan':
      return meld.tiles.length === 4 &&
        meld.tiles.every(isTileCode) &&
        isRelativePosition(meld.from) &&
        areSameTileKinds(meld.tiles)
        ? { ...meld, tiles: [...meld.tiles] as [TileCode, TileCode, TileCode, TileCode] }
        : null;
    case 'kakan':
      return meld.tiles.length === 4 &&
        meld.tiles.every(isTileCode) &&
        isRelativePosition(meld.from) &&
        areSameTileKinds(meld.tiles)
        ? { ...meld, tiles: [...meld.tiles] as [TileCode, TileCode, TileCode, TileCode] }
        : null;
    case 'ankan':
      return meld.tiles.length === 4 && meld.tiles.every(isTileCode) && areSameTileKinds(meld.tiles)
        ? { ...meld, tiles: [...meld.tiles] as [TileCode, TileCode, TileCode, TileCode] }
        : null;
    default:
      return null;
  }
};

const getRiichiState = (handLog: HandLog, playerId: string): AnalysisEntry['yaku']['riichi'] => {
  return handLog.result.riichiPlayerIds?.includes(playerId) ? 'normal' : 'none';
};

const extractScoringSummary = (
  handLog: HandLog,
  playerId: string,
  eventType: AnalysisEventType,
): Pick<AnalysisEntry['yaku'], 'han' | 'fu'> => {
  if (handLog.result.type !== 'Win') {
    return {};
  }

  const payment =
    eventType === 'win'
      ? handLog.result.winners?.find((winner) => winner.id === playerId)?.payment
      : handLog.result.winners?.length === 1
        ? handLog.result.winners[0]?.payment
        : undefined;

  if (!payment?.name) {
    return {};
  }

  const explicitHanFu = payment.name.match(/^(\d+)翻(\d+)符$/);
  if (explicitHanFu) {
    return {
      han: Number.parseInt(explicitHanFu[1], 10),
      fu: Number.parseInt(explicitHanFu[2], 10),
    };
  }

  const explicitHan = payment.name.match(/^(\d+)翻(?:\s*\(固定\))$/);
  if (explicitHan) {
    return {
      han: Number.parseInt(explicitHan[1], 10),
    };
  }

  return {};
};

export const getAnalysisEventType = (
  handLog: HandLog,
  playerId: string,
): AnalysisEventType | null => {
  if (handLog.result.type === 'Win') {
    if (handLog.result.winners?.some((winner) => winner.id === playerId)) {
      return 'win';
    }

    if (handLog.result.loserId === playerId) {
      return 'deal-in';
    }

    return null;
  }

  return handLog.result.tenpaiPlayerIds?.includes(playerId) ? 'tenpai-draw' : null;
};

export interface CreateAnalysisEntrySeedParams {
  uid: string;
  handLog: HandLog;
  playerId: string;
  players: Pick<Player, 'id' | 'wind'>[];
  source: AnalysisSource;
  now?: number;
  entryId?: string;
}

export const createAnalysisEntrySeed = ({
  uid,
  handLog,
  playerId,
  players,
  source,
  now = Date.now(),
  entryId,
}: CreateAnalysisEntrySeedParams): AnalysisEntry => {
  const player = players.find((candidate) => candidate.id === playerId);

  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }

  const eventType = getAnalysisEventType(handLog, playerId);
  if (!eventType) {
    throw new Error(`HandLog ${handLog.id} is not analysable for player ${playerId}`);
  }

  const normalizedSource: AnalysisSource = {
    ...source,
    handLogId: handLog.id,
  };

  return normalizeAnalysisEntry({
    id: entryId ?? normalizedSource.handLogId,
    uid,
    source: normalizedSource,
    context: {
      round: {
        wind: handLog.round.wind,
        number: handLog.round.number,
        honba: handLog.round.honba,
      },
      seatWind: player.wind,
      roundWind: handLog.round.wind,
      eventType,
      isDealer: player.wind === 'East',
    },
    hand: {
      concealed: [],
      melds: [],
      wait: [],
    },
    dora: {
      doraIndicators: [],
      uraIndicators: [],
      kanDoraIndicators: [],
      kanUraIndicators: [],
      redFiveCount: 0,
    },
    yaku: {
      list: [],
      yakuman: [],
      ippatsu: false,
      riichi: getRiichiState(handLog, playerId),
      special: null,
      ...extractScoringSummary(handLog, playerId, eventType),
    },
    notes: '',
    createdAt: now,
    updatedAt: now,
  });
};

export const normalizeAnalysisEntry = (entry: AnalysisEntry): AnalysisEntry => {
  const normalizedWait = unique((entry.hand.wait ?? []).filter(isWaitShape));
  const normalizedYakuList = unique((entry.yaku.list ?? []).filter(isYakuId));
  const normalizedYakumanList = unique((entry.yaku.yakuman ?? []).filter(isYakumanId));
  const normalizedWinningTile =
    entry.context.eventType === 'tenpai-draw' || !isTileCode(entry.hand.winningTile)
      ? undefined
      : entry.hand.winningTile;

  return {
    ...entry,
    source: {
      ...entry.source,
      handLogId: entry.source.handLogId,
    },
    context: {
      ...entry.context,
      round: {
        wind: entry.context.round.wind,
        number: parseNonNegativeInteger(entry.context.round.number),
        honba: parseNonNegativeInteger(entry.context.round.honba),
      },
      isDealer: entry.context.seatWind === 'East' ? true : entry.context.isDealer,
    },
    hand: {
      concealed: normalizeTileCodes(entry.hand.concealed),
      melds: (entry.hand.melds ?? [])
        .map(normalizeMeld)
        .filter((meld): meld is Meld => meld !== null),
      ...(normalizedWinningTile ? { winningTile: normalizedWinningTile } : {}),
      wait: normalizedWait,
    },
    dora: {
      doraIndicators: normalizeTileCodes(entry.dora.doraIndicators),
      uraIndicators: normalizeTileCodes(entry.dora.uraIndicators),
      kanDoraIndicators: normalizeTileCodes(entry.dora.kanDoraIndicators),
      kanUraIndicators: normalizeTileCodes(entry.dora.kanUraIndicators),
      redFiveCount: parseNonNegativeInteger(entry.dora.redFiveCount),
    },
    yaku: {
      ...entry.yaku,
      list: normalizedYakuList,
      yakuman: normalizedYakumanList,
      han: parsePositiveInteger(entry.yaku.han),
      fu: parsePositiveInteger(entry.yaku.fu),
    },
    notes: entry.notes.trim().slice(0, 2000),
    createdAt: parseNonNegativeInteger(entry.createdAt),
    updatedAt: parseNonNegativeInteger(entry.updatedAt),
  };
};

import type {
  AnalysisEventType,
  AnalysisHand,
  AnalysisWaitTile,
  AnalysisWaits,
  TileCode,
  WaitCategory,
} from '../types/analysis';
import { TILE_CODES, isRedFive, normalizeTileCode } from './tiles';

const STANDARD_TILE_CODES = TILE_CODES.filter((tile) => !isRedFive(tile));
const TILE_INDEX = new Map(STANDARD_TILE_CODES.map((tile, index) => [tile, index]));
const KOKUSHI_INDICES = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

const unique = <T>(values: T[]): T[] => {
  return [...new Set(values)];
};

const toCanonicalTile = (tile: TileCode): TileCode => {
  return normalizeTileCode(tile);
};

const toTileIndex = (tile: TileCode): number => {
  const index = TILE_INDEX.get(toCanonicalTile(tile));
  if (index === undefined) {
    throw new Error(`Unknown tile code: ${tile}`);
  }

  return index;
};

const fromTileIndex = (index: number): TileCode => {
  return STANDARD_TILE_CODES[index];
};

const getTileSuit = (index: number): 'm' | 'p' | 's' | 'z' => {
  return fromTileIndex(index)[1] as 'm' | 'p' | 's' | 'z';
};

const getTileRank = (index: number): number => {
  return Number.parseInt(fromTileIndex(index)[0], 10);
};

const isHonorIndex = (index: number): boolean => {
  return getTileSuit(index) === 'z';
};

const isSameSuit = (left: number, right: number): boolean => {
  return getTileSuit(left) === getTileSuit(right);
};

const removeOneMatchingTile = (tiles: TileCode[], tile: TileCode): TileCode[] => {
  const target = toCanonicalTile(tile);
  let removed = false;

  return tiles.filter((currentTile) => {
    if (!removed && toCanonicalTile(currentTile) === target) {
      removed = true;
      return false;
    }

    return true;
  });
};

const buildTileCounts = (tiles: TileCode[]): number[] => {
  const counts = Array.from({ length: STANDARD_TILE_CODES.length }, () => 0);

  for (const tile of tiles) {
    counts[toTileIndex(tile)] += 1;
  }

  return counts;
};

const allCountsAreEmpty = (counts: number[]): boolean => {
  return counts.every((count) => count === 0);
};

const classifySequenceRole = (startIndex: number, candidatePosition: 0 | 1 | 2): WaitCategory => {
  if (candidatePosition === 1) {
    return 'kanchan';
  }

  const startRank = getTileRank(startIndex);

  if (
    (startRank === 1 && candidatePosition === 2) ||
    (startRank === 7 && candidatePosition === 0)
  ) {
    return 'penchan';
  }

  return 'ryanmen';
};

const collectWinningRoles = (
  counts: number[],
  groupsRemaining: number,
  candidateIndex: number,
  candidateRole: WaitCategory | undefined,
  roles: Set<WaitCategory>,
): void => {
  if (groupsRemaining === 0) {
    if (candidateRole && allCountsAreEmpty(counts)) {
      roles.add(candidateRole);
    }
    return;
  }

  const firstIndex = counts.findIndex((count) => count > 0);
  if (firstIndex === -1) {
    return;
  }

  const firstCount = counts[firstIndex];

  if (firstCount >= 3) {
    counts[firstIndex] -= 3;

    if (!candidateRole && firstIndex === candidateIndex) {
      if (firstCount > 3) {
        collectWinningRoles(counts, groupsRemaining - 1, candidateIndex, undefined, roles);
      }
      collectWinningRoles(counts, groupsRemaining - 1, candidateIndex, 'shabo', roles);
    } else {
      collectWinningRoles(counts, groupsRemaining - 1, candidateIndex, candidateRole, roles);
    }

    counts[firstIndex] += 3;
  }

  if (!isHonorIndex(firstIndex) && getTileRank(firstIndex) <= 7) {
    const secondIndex = firstIndex + 1;
    const thirdIndex = firstIndex + 2;

    if (
      counts[secondIndex] > 0 &&
      counts[thirdIndex] > 0 &&
      isSameSuit(firstIndex, secondIndex) &&
      isSameSuit(firstIndex, thirdIndex)
    ) {
      const candidateCount = counts[candidateIndex];
      let candidatePosition: 0 | 1 | 2 | null = null;

      if (firstIndex === candidateIndex) {
        candidatePosition = 0;
      } else if (secondIndex === candidateIndex) {
        candidatePosition = 1;
      } else if (thirdIndex === candidateIndex) {
        candidatePosition = 2;
      }

      counts[firstIndex] -= 1;
      counts[secondIndex] -= 1;
      counts[thirdIndex] -= 1;

      if (!candidateRole && candidatePosition !== null) {
        if (candidateCount > 1) {
          collectWinningRoles(counts, groupsRemaining - 1, candidateIndex, undefined, roles);
        }
        collectWinningRoles(
          counts,
          groupsRemaining - 1,
          candidateIndex,
          classifySequenceRole(firstIndex, candidatePosition),
          roles,
        );
      } else {
        collectWinningRoles(counts, groupsRemaining - 1, candidateIndex, candidateRole, roles);
      }

      counts[firstIndex] += 1;
      counts[secondIndex] += 1;
      counts[thirdIndex] += 1;
    }
  }
};

const collectStandardCategories = (
  baseCounts: number[],
  candidateIndex: number,
  meldCount: number,
): WaitCategory[] => {
  const counts = [...baseCounts];
  counts[candidateIndex] += 1;

  const groupsNeeded = 4 - meldCount;
  if (groupsNeeded < 0) {
    return [];
  }

  const roles = new Set<WaitCategory>();

  for (let pairIndex = 0; pairIndex < counts.length; pairIndex += 1) {
    const pairCount = counts[pairIndex];
    if (pairCount < 2) {
      continue;
    }

    counts[pairIndex] -= 2;

    if (pairIndex === candidateIndex) {
      if (pairCount > 2) {
        collectWinningRoles(counts, groupsNeeded, candidateIndex, undefined, roles);
      }
      collectWinningRoles(counts, groupsNeeded, candidateIndex, 'tanki', roles);
    } else {
      collectWinningRoles(counts, groupsNeeded, candidateIndex, undefined, roles);
    }

    counts[pairIndex] += 2;
  }

  return [...roles];
};

const isSevenPairsWait = (
  baseCounts: number[],
  candidateIndex: number,
  meldCount: number,
): boolean => {
  if (meldCount > 0) {
    return false;
  }

  const counts = [...baseCounts];
  counts[candidateIndex] += 1;

  return counts.every((count) => count === 0 || count === 2);
};

const isKokushiWait = (
  baseCounts: number[],
  candidateIndex: number,
  meldCount: number,
): boolean => {
  if (meldCount > 0) {
    return false;
  }

  const counts = [...baseCounts];
  counts[candidateIndex] += 1;

  let pairFound = false;

  for (let index = 0; index < counts.length; index += 1) {
    const count = counts[index];
    const isKokushiTile = KOKUSHI_INDICES.includes(index);

    if (!isKokushiTile && count > 0) {
      return false;
    }

    if (isKokushiTile) {
      if (count === 0) {
        return false;
      }

      if (count >= 2) {
        pairFound = true;
      }
    }
  }

  return pairFound;
};

const sortTileEntries = (tiles: AnalysisWaitTile[]): AnalysisWaitTile[] => {
  return [...tiles].sort((left, right) => toTileIndex(left.tile) - toTileIndex(right.tile));
};

const hasConsecutiveBlock = (
  counts: number[],
  suit: 'm' | 'p' | 's',
  startRank: number,
  endRank: number,
): boolean => {
  for (let rank = startRank; rank <= endRank; rank += 1) {
    const tile = `${rank}${suit}` as TileCode;
    if (counts[toTileIndex(tile)] === 0) {
      return false;
    }
  }

  return true;
};

const decorateComplexCategories = (
  counts: number[],
  tiles: AnalysisWaitTile[],
): AnalysisWaitTile[] => {
  const sortedTiles = sortTileEntries(tiles);
  const tileIndices = sortedTiles.map((tile) => toTileIndex(tile.tile));

  if (sortedTiles.length === 2) {
    const [firstIndex, secondIndex] = tileIndices;
    const firstSuit = getTileSuit(firstIndex);
    const secondSuit = getTileSuit(secondIndex);
    const firstRank = getTileRank(firstIndex);
    const secondRank = getTileRank(secondIndex);
    const bothTanki = sortedTiles.every((tile) => tile.categories.includes('tanki'));

    if (
      bothTanki &&
      firstSuit === secondSuit &&
      firstSuit !== 'z' &&
      secondRank - firstRank === 3 &&
      hasConsecutiveBlock(counts, firstSuit, firstRank, secondRank)
    ) {
      return sortedTiles.map((tile) => ({
        ...tile,
        categories: unique([...tile.categories, 'nobetan']),
      }));
    }
  }

  if (sortedTiles.length === 3) {
    const [firstIndex, secondIndex, thirdIndex] = tileIndices;
    const suit = getTileSuit(firstIndex);
    const firstRank = getTileRank(firstIndex);
    const secondRank = getTileRank(secondIndex);
    const thirdRank = getTileRank(thirdIndex);

    if (
      suit !== 'z' &&
      getTileSuit(secondIndex) === suit &&
      getTileSuit(thirdIndex) === suit &&
      secondRank - firstRank === 3 &&
      thirdRank - secondRank === 3 &&
      hasConsecutiveBlock(counts, suit, firstRank + 1, thirdRank - 1)
    ) {
      return sortedTiles.map((tile) => ({
        ...tile,
        categories: unique([...tile.categories, 'sanmen']),
      }));
    }

    return sortedTiles.map((tile) => ({
      ...tile,
      categories: unique([...tile.categories, 'irregular']),
    }));
  }

  if (sortedTiles.length > 3) {
    return sortedTiles.map((tile) => ({
      ...tile,
      categories: unique([...tile.categories, 'irregular']),
    }));
  }

  return sortedTiles;
};

const hasAnyHandTiles = ({
  concealed,
  melds,
  winningTile,
}: Pick<AnalysisHand, 'concealed' | 'melds' | 'winningTile'>): boolean => {
  return concealed.length > 0 || melds.length > 0 || winningTile !== undefined;
};

export const detectHandWaits = ({
  eventType,
  hand,
}: {
  eventType: AnalysisEventType;
  hand: Pick<AnalysisHand, 'concealed' | 'melds' | 'winningTile'>;
}): AnalysisWaits | undefined => {
  if (!hasAnyHandTiles(hand)) {
    return undefined;
  }

  const meldCount = hand.melds.length;
  const expectedClosedTileCount = (4 - meldCount) * 3 + 1;
  let concealedTiles = hand.concealed.map(toCanonicalTile);

  if (eventType !== 'tenpai-draw') {
    if (!hand.winningTile) {
      return { kind: 'unresolved', tiles: [], categories: [] };
    }

    if (concealedTiles.length === expectedClosedTileCount + 1) {
      concealedTiles = removeOneMatchingTile(concealedTiles, hand.winningTile);
    }
  }

  if (expectedClosedTileCount < 1 || concealedTiles.length !== expectedClosedTileCount) {
    return { kind: 'unresolved', tiles: [], categories: [] };
  }

  const counts = buildTileCounts(concealedTiles);
  if (counts.some((count) => count > 4)) {
    return { kind: 'unresolved', tiles: [], categories: [] };
  }

  const waitTiles: AnalysisWaitTile[] = [];

  for (const candidateTile of STANDARD_TILE_CODES) {
    const candidateIndex = toTileIndex(candidateTile);
    if (counts[candidateIndex] >= 4) {
      continue;
    }

    const categories = new Set<WaitCategory>(
      collectStandardCategories(counts, candidateIndex, meldCount),
    );

    if (isSevenPairsWait(counts, candidateIndex, meldCount)) {
      categories.add('tanki');
    }

    if (isKokushiWait(counts, candidateIndex, meldCount)) {
      categories.add('irregular');
    }

    if (categories.size > 0) {
      waitTiles.push({
        tile: candidateTile,
        categories: [...categories],
      });
    }
  }

  if (waitTiles.length === 0) {
    return { kind: 'unresolved', tiles: [], categories: [] };
  }

  const normalizedTiles = decorateComplexCategories(counts, waitTiles).map((tile) => ({
    ...tile,
    categories: unique(tile.categories),
  }));
  const categories = unique(normalizedTiles.flatMap((tile) => tile.categories));

  return {
    kind: 'auto',
    tiles: normalizedTiles,
    categories,
  };
};

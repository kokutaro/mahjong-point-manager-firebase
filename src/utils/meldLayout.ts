import type { Meld, RelativePosition } from '../types/analysis';

const PON_SIDEWAYS_INDEX: Record<RelativePosition, number> = {
  shimocha: 0,
  toimen: 1,
  kamicha: 2,
};

const MINKAN_SIDEWAYS_INDEX: Record<RelativePosition, number> = {
  shimocha: 0,
  toimen: 1,
  kamicha: 3,
};

export const getSidewaysIndex = (meld: Meld): number | null => {
  switch (meld.kind) {
    case 'chi':
      return 0;
    case 'pon':
      return PON_SIDEWAYS_INDEX[meld.from];
    case 'minkan':
      return MINKAN_SIDEWAYS_INDEX[meld.from];
    case 'ankan':
      return null;
    case 'kakan':
      return PON_SIDEWAYS_INDEX[meld.from];
  }
};

export const isAnkanBackTile = (index: number): boolean => {
  return index === 0 || index === 3;
};

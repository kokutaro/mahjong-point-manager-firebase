import { describe, expect, it } from 'vitest';
import type { AnalysisEventType, TileCode } from '../types/analysis';
import { parseHandNotation } from './handNotation';
import { detectHandWaits } from './waits';

const detectFromNotation = (eventType: AnalysisEventType, notation: string) => {
  const result = parseHandNotation(notation);
  if (!result.success) {
    throw new Error(result.error.message);
  }

  return detectHandWaits({
    eventType,
    hand: {
      concealed: result.hand.concealed,
      melds: result.hand.melds,
      ...(result.hand.tsumo
        ? { winningTile: result.hand.tsumo }
        : result.hand.ron
          ? { winningTile: result.hand.ron.tile }
          : {}),
    },
  });
};

const toWaitMap = (waits: ReturnType<typeof detectHandWaits>) => {
  return Object.fromEntries(
    (waits?.tiles ?? []).map((waitTile) => {
      return [waitTile.tile, waitTile.categories];
    }),
  ) as Record<TileCode, string[]>;
};

describe('detectHandWaits', () => {
  it('detects the issue example as a ryanmen wait after removing the winning tile', () => {
    const waits = detectFromNotation('win', 'm123456s123z22p231_');

    expect(waits?.kind).toBe('auto');
    expect(toWaitMap(waits)).toEqual({
      '1p': ['ryanmen'],
      '4p': ['ryanmen'],
    });
  });

  it('detects penchan waits', () => {
    const waits = detectFromNotation('tenpai-draw', 'm123456s123z22p89');
    expect(toWaitMap(waits)).toEqual({
      '7p': ['penchan'],
    });
  });

  it('detects kanchan waits', () => {
    const waits = detectFromNotation('tenpai-draw', 'm123456s123z22p24');
    expect(toWaitMap(waits)).toEqual({
      '3p': ['kanchan'],
    });
  });

  it('detects shabo waits', () => {
    const waits = detectFromNotation('tenpai-draw', 'm123456s123p11z22');
    expect(toWaitMap(waits)).toEqual({
      '1p': ['shabo'],
      '2z': ['shabo'],
    });
  });

  it('detects tanki waits', () => {
    const waits = detectFromNotation('tenpai-draw', 'm123456s123p789z1');
    expect(toWaitMap(waits)).toEqual({
      '1z': ['tanki'],
    });
  });

  it('detects nobetan waits', () => {
    const waits = detectFromNotation('tenpai-draw', 'm2345s123p123z111');
    expect(toWaitMap(waits)).toEqual({
      '2m': ['tanki', 'nobetan'],
      '5m': ['tanki', 'nobetan'],
    });
  });

  it('detects sanmen waits', () => {
    const waits = detectFromNotation('tenpai-draw', 'm23456s123p123z11');
    expect(toWaitMap(waits)).toEqual({
      '1m': ['ryanmen', 'sanmen'],
      '4m': ['ryanmen', 'sanmen'],
      '7m': ['ryanmen', 'sanmen'],
    });
  });

  it('classifies irregular three-sided waits as irregular', () => {
    const waits = detectFromNotation('tenpai-draw', 'm55567789p678z11');
    expect(toWaitMap(waits)).toEqual({
      '5m': ['ryanmen', 'shabo', 'irregular'],
      '8m': ['kanchan', 'ryanmen', 'irregular'],
      '1z': ['shabo', 'irregular'],
    });
  });

  it('classifies kokushi waits as irregular', () => {
    const waits = detectFromNotation('tenpai-draw', 'm19p19s19z1234567');

    expect(waits?.tiles).toHaveLength(13);
    expect(waits?.tiles.every((waitTile) => waitTile.categories.includes('irregular'))).toBe(true);
  });

  it('detects waits for open hands with melds', () => {
    const waits = detectFromNotation('tenpai-draw', 'm123456p23z22,z111-');
    expect(toWaitMap(waits)).toEqual({
      '1p': ['ryanmen'],
      '4p': ['ryanmen'],
    });
  });

  it('returns unresolved when the hand cannot be analysed safely', () => {
    const waits = detectFromNotation('win', 'm123456s123z22p23');
    expect(waits).toEqual({
      kind: 'unresolved',
      tiles: [],
      categories: [],
    });
  });

  it('does not remove a matching concealed tile when the winning tile is already excluded', () => {
    const waits = detectFromNotation('win', 'm123456s123p111z22_');

    expect(toWaitMap(waits)).toEqual({
      '2z': ['tanki'],
    });
  });
});

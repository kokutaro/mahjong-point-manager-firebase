import { describe, expect, it } from 'vitest';
import {
  TILE_CODES,
  TILE_GROUPS,
  createMeldDraft,
  getTileImageAssetPaths,
  getTileMetadata,
  isRedFive,
  isTileCode,
  normalizeTileCode,
} from './tiles';

describe('tiles', () => {
  it('exposes tile codes in grouped picker order including red fives', () => {
    expect(TILE_CODES).toHaveLength(37);
    expect(TILE_CODES.slice(0, 10)).toEqual([
      '1m',
      '2m',
      '3m',
      '4m',
      '5m',
      '0m',
      '6m',
      '7m',
      '8m',
      '9m',
    ]);
    expect(TILE_CODES.slice(10, 20)).toEqual([
      '1p',
      '2p',
      '3p',
      '4p',
      '5p',
      '0p',
      '6p',
      '7p',
      '8p',
      '9p',
    ]);
    expect(TILE_CODES.slice(20, 30)).toEqual([
      '1s',
      '2s',
      '3s',
      '4s',
      '5s',
      '0s',
      '6s',
      '7s',
      '8s',
      '9s',
    ]);
    expect(TILE_CODES.slice(30)).toEqual(['1z', '2z', '3z', '4z', '5z', '6z', '7z']);
  });

  it('provides grouped definitions with Japanese labels and suit palettes', () => {
    expect(TILE_GROUPS.map((group) => group.id)).toEqual(['manzu', 'pinzu', 'souzu', 'honor']);
    expect(TILE_GROUPS.map((group) => group.label)).toEqual(['萬子', '筒子', '索子', '字牌']);
    expect(TILE_GROUPS[0].palette.id).toBe('manzu');
    expect(TILE_GROUPS[3].tiles).toEqual(['1z', '2z', '3z', '4z', '5z', '6z', '7z']);
  });

  it('normalizes red fives while preserving display metadata', () => {
    const tile = getTileMetadata('0s');

    expect(tile.code).toBe('0s');
    expect(tile.normalizedCode).toBe('5s');
    expect(tile.group).toBe('souzu');
    expect(tile.label).toBe('赤5索');
    expect(tile.shortLabel).toBe('5索');
    expect(tile.isRed).toBe(true);
    expect(tile.isHonor).toBe(false);
    expect(tile.palette.id).toBe('souzu');
    expect(tile.rank).toBe(5);
  });

  it('detects valid tile codes and red fives', () => {
    expect(isTileCode('7z')).toBe(true);
    expect(isTileCode('0m')).toBe(true);
    expect(isTileCode('8z')).toBe(false);
    expect(isTileCode('1x')).toBe(false);
    expect(isRedFive('0p')).toBe(true);
    expect(isRedFive('5p')).toBe(false);
    expect(normalizeTileCode('0m')).toBe('5m');
    expect(normalizeTileCode('7z')).toBe('7z');
  });

  it('creates sensible meld drafts from a base tile', () => {
    expect(createMeldDraft('chi', '9p')).toEqual({
      kind: 'chi',
      from: 'kamicha',
      tiles: ['7p', '8p', '9p'],
    });
    expect(createMeldDraft('pon', '0m')).toEqual({
      kind: 'pon',
      from: 'toimen',
      tiles: ['0m', '5m', '5m'],
    });
    expect(createMeldDraft('minkan', '6z')).toEqual({
      kind: 'minkan',
      from: 'toimen',
      tiles: ['6z', '6z', '6z', '6z'],
    });
    expect(createMeldDraft('ankan')).toEqual({
      kind: 'ankan',
      tiles: ['1m', '1m', '1m', '1m'],
    });
  });

  it('resolves composite tile asset paths for light and dark themes', () => {
    expect(getTileImageAssetPaths('1m')).toEqual({
      frontPath: '/img/tiles/light/Front.svg',
      facePath: '/img/tiles/light/Man1.svg',
    });
    expect(getTileImageAssetPaths('7z')).toEqual({
      frontPath: '/img/tiles/light/Front.svg',
      facePath: '/img/tiles/light/Chun.svg',
    });
    expect(getTileImageAssetPaths('0p', 'dark')).toEqual({
      frontPath: '/img/tiles/dark/Front.svg',
      facePath: '/img/tiles/dark/Pin5-Dora.svg',
    });
  });

  it('rejects chi meld drafts from honor tiles', () => {
    expect(() => createMeldDraft('chi', '6z')).toThrow(
      'Chi meld cannot be created from an honor tile',
    );
  });
});

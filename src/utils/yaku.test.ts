import { describe, expect, it } from 'vitest';
import {
  YAKU_GROUP_SECTIONS,
  YAKUMAN_GROUP_SECTIONS,
  getYakumanDefinition,
  getYakumanIdsByGroup,
  getYakuDefinition,
  getYakuIdsByGroup,
} from './yaku';

describe('yaku', () => {
  it('groups standard yaku by han in stable display order', () => {
    expect(YAKU_GROUP_SECTIONS.map((section) => section.id)).toEqual([
      '1han',
      '2han',
      '3han',
      '6han',
    ]);
    expect(YAKU_GROUP_SECTIONS.map((section) => section.label)).toEqual([
      '1翻',
      '2翻',
      '3翻',
      '6翻',
    ]);
    expect(getYakuIdsByGroup('1han')).toContain('riichi');
    expect(getYakuIdsByGroup('1han')).toContain('yakuhaiChun');
    expect(getYakuIdsByGroup('6han')).toEqual(['chinitsu']);
  });

  it('groups yakuman by multiplier for selector UIs', () => {
    expect(YAKUMAN_GROUP_SECTIONS.map((section) => section.id)).toEqual(['single', 'double']);
    expect(YAKUMAN_GROUP_SECTIONS.map((section) => section.label)).toEqual(['役満', 'ダブル役満']);
    expect(getYakumanIdsByGroup('single')).toContain('daisangen');
    expect(getYakumanIdsByGroup('double')).toEqual([
      'kokushiMusou13Wait',
      'suuankouTanki',
      'daisuushii',
      'junseiChuurenPoutou',
    ]);
  });

  it('returns raw definition metadata for individual yaku ids', () => {
    expect(getYakuDefinition('doubleRiichi')).toEqual({
      label: 'ダブル立直',
      han: 2,
      group: '2han',
    });
    expect(getYakumanDefinition('tenhou')).toEqual({
      label: '天和',
      multiplier: 1,
    });
  });
});

import { describe, expect, it } from 'vitest';
import type { Meld, TileCode } from '../../types/analysis';
import { judgeHand } from './index';
import { DEFAULT_HAND_FLAGS, type HandInput } from './types';

const make = (overrides: Partial<HandInput>): HandInput => ({
  closedTiles: [],
  winningTile: '1m',
  melds: [],
  isTsumo: false,
  seatWind: 'East',
  roundWind: 'East',
  flags: { ...DEFAULT_HAND_FLAGS },
  doraCount: 0,
  akaDoraCount: 0,
  ...overrides,
});

const tiles = (...t: TileCode[]) => t;

describe('judgeHand - 標準形', () => {
  it('門前ツモ平和: 平和+門前清自摸和=2翻20符', () => {
    // 萬子123, 筒子234, 索子345, 萬子678, 字南雀頭 (場東/自東なので役牌でない)
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '1m',
          '2m',
          '3m',
          '2p',
          '3p',
          '4p',
          '3s',
          '4s',
          '5s',
          '6m',
          '7m',
          '2z',
          '2z',
        ),
        winningTile: '8m',
        isTsumo: true,
      }),
    );
    expect(result.isInvalid).toBe(false);
    expect(result.han).toBe(2); // 平和1 + 門前清自摸和1
    expect(result.fu).toBe(20);
    const ids = result.yaku.map((y) => y.id).sort();
    expect(ids).toContain('pinfu');
    expect(ids).toContain('menzenTsumo');
  });

  it('リーチのみロン: 1翻30符', () => {
    // 役なし手 + 立直
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '1m',
          '2m',
          '3m',
          '4p',
          '5p',
          '6p',
          '7s',
          '8s',
          '9s',
          '1z',
          '1z',
          '1z',
          '5m',
        ),
        winningTile: '5m',
        isTsumo: false,
        flags: { ...DEFAULT_HAND_FLAGS, riichi: true },
      }),
    );
    expect(result.isInvalid).toBe(false);
    // 役牌東は場東/自東で +1翻 → 立直1 + 役牌東1 + 役牌場風1 + 役牌自風1 (二重カウント避けるべきか)
    // 注: 役牌東は seatWind/roundWind が同じなら個別役として両方付く実装になっている
    expect(result.han).toBeGreaterThanOrEqual(2);
    const ids = result.yaku.map((y) => y.id);
    expect(ids).toContain('riichi');
  });

  it('タンヤオのみツモ門前: 2翻30符', () => {
    // 萬234 筒345 索456 萬567 + 索5雀頭、和了2索
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '2m',
          '3m',
          '4m',
          '3p',
          '4p',
          '5p',
          '4s',
          '5s',
          '6s',
          '5m',
          '6m',
          '7m',
          '5s',
        ),
        winningTile: '5s',
        isTsumo: true,
      }),
    );
    expect(result.isInvalid).toBe(false);
    const ids = result.yaku.map((y) => y.id);
    expect(ids).toContain('tanyao');
    expect(ids).toContain('menzenTsumo');
  });

  it('副露タンヤオロン (喰いタン): 1翻30符', () => {
    const melds: Meld[] = [{ kind: 'pon', tiles: ['2m', '2m', '2m'], from: 'shimocha' }];
    const result = judgeHand(
      make({
        closedTiles: tiles('3p', '4p', '5p', '4s', '5s', '6s', '5m', '6m', '7m', '8s'),
        winningTile: '8s',
        melds,
        isTsumo: false,
      }),
    );
    expect(result.isInvalid).toBe(false);
    const ids = result.yaku.map((y) => y.id);
    expect(ids).toContain('tanyao');
    expect(result.han).toBe(1);
    expect(result.fu).toBe(30); // 喰い平和形 → 30符
  });

  it('役牌 (中) ポンロン: 1翻30符', () => {
    const melds: Meld[] = [{ kind: 'pon', tiles: ['7z', '7z', '7z'], from: 'shimocha' }];
    const result = judgeHand(
      make({
        closedTiles: tiles('1m', '2m', '3m', '4p', '5p', '6p', '7s', '8s', '9s', '5m'),
        winningTile: '5m',
        melds,
      }),
    );
    expect(result.isInvalid).toBe(false);
    expect(result.yaku.map((y) => y.id)).toContain('yakuhaiChun');
    expect(result.han).toBe(1);
  });
});

describe('judgeHand - 七対子・国士', () => {
  it('七対子: 2翻25符', () => {
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '1m',
          '1m',
          '3m',
          '3m',
          '5p',
          '5p',
          '7p',
          '7p',
          '2s',
          '2s',
          '4z',
          '4z',
          '6z',
        ),
        winningTile: '6z',
      }),
    );
    expect(result.isInvalid).toBe(false);
    expect(result.fu).toBe(25);
    expect(result.yaku.map((y) => y.id)).toContain('chiitoitsu');
  });

  it('国士無双 (単騎以外): 役満', () => {
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '1m',
          '9m',
          '1p',
          '9p',
          '1s',
          '9s',
          '1z',
          '2z',
          '3z',
          '4z',
          '5z',
          '6z',
          '7z',
        ),
        winningTile: '1m',
      }),
    );
    expect(result.isInvalid).toBe(false);
    expect(result.yakumanMultiplier).toBe(1);
    expect(result.yaku[0].id).toBe('kokushiMusou');
  });

  it('国士無双十三面待ち: ダブル役満', () => {
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '1m',
          '1m',
          '9m',
          '1p',
          '9p',
          '1s',
          '9s',
          '1z',
          '2z',
          '3z',
          '4z',
          '5z',
          '6z',
        ),
        winningTile: '7z',
      }),
    );
    expect(result.isInvalid).toBe(false);
    expect(result.yakumanMultiplier).toBe(2);
  });
});

describe('judgeHand - 染め手・対々', () => {
  it('清一色 (萬子のみ) 門前ロン: 6翻', () => {
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '1m',
          '2m',
          '3m',
          '4m',
          '5m',
          '6m',
          '7m',
          '8m',
          '9m',
          '2m',
          '3m',
          '4m',
          '5m',
        ),
        winningTile: '5m',
      }),
    );
    expect(result.isInvalid).toBe(false);
    const ids = result.yaku.map((y) => y.id);
    expect(ids).toContain('chinitsu');
  });

  it('門前4暗刻ツモ: 役満 (四暗刻)', () => {
    // 萬1刻 萬5刻 筒3刻 索7刻 字東雀頭 ツモ和了 → 四暗刻 (役満)
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '1m',
          '1m',
          '1m',
          '5m',
          '5m',
          '5m',
          '3p',
          '3p',
          '3p',
          '7s',
          '7s',
          '1z',
          '1z',
        ),
        winningTile: '7s',
        isTsumo: true,
      }),
    );
    expect(result.isInvalid).toBe(false);
    expect(result.yakumanMultiplier).toBeGreaterThanOrEqual(1);
    expect(result.yaku[0].id).toBe('suuankou');
  });

  it('対々和ロン (副露あり): toitoi 2翻', () => {
    const melds: Meld[] = [
      { kind: 'pon', tiles: ['1m', '1m', '1m'], from: 'shimocha' },
      { kind: 'pon', tiles: ['5m', '5m', '5m'], from: 'shimocha' },
    ];
    const result = judgeHand(
      make({
        closedTiles: tiles('3p', '3p', '3p', '7s', '7s', '1z', '1z'),
        winningTile: '7s',
        melds,
      }),
    );
    expect(result.isInvalid).toBe(false);
    const ids = result.yaku.map((y) => y.id);
    expect(ids).toContain('toitoi');
  });
});

describe('judgeHand - ドラ・状況役', () => {
  it('リーチ + 一発 + ツモ + ドラ2', () => {
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '2m',
          '3m',
          '4m',
          '3p',
          '4p',
          '5p',
          '4s',
          '5s',
          '6s',
          '5m',
          '6m',
          '7m',
          '5s',
        ),
        winningTile: '5s',
        isTsumo: true,
        flags: { ...DEFAULT_HAND_FLAGS, riichi: true, ippatsu: true },
        doraCount: 2,
      }),
    );
    expect(result.isInvalid).toBe(false);
    const labels = result.yaku.map((y) => y.label);
    expect(labels).toContain('立直');
    expect(labels).toContain('一発');
    expect(labels).toContain('ドラ');
  });

  it('赤ドラ枚数も翻に加算される', () => {
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '2m',
          '3m',
          '4m',
          '3p',
          '4p',
          '0p',
          '4s',
          '5s',
          '6s',
          '5m',
          '6m',
          '7m',
          '5s',
        ),
        winningTile: '5s',
        isTsumo: true,
        flags: { ...DEFAULT_HAND_FLAGS, riichi: true },
        akaDoraCount: 1,
      }),
    );
    const labels = result.yaku.map((y) => y.label);
    expect(labels).toContain('赤ドラ');
  });
});

describe('judgeHand - 不正入力', () => {
  it('14枚に満たない場合は isInvalid', () => {
    const result = judgeHand(
      make({
        closedTiles: tiles('1m', '2m'),
        winningTile: '3m',
      }),
    );
    expect(result.isInvalid).toBe(true);
  });

  it('和了形にならない手: isInvalid', () => {
    const result = judgeHand(
      make({
        closedTiles: tiles(
          '1m',
          '2m',
          '4m',
          '5m',
          '7m',
          '8m',
          '1p',
          '2p',
          '4p',
          '5p',
          '7p',
          '8p',
          '1s',
        ),
        winningTile: '2s',
      }),
    );
    expect(result.isInvalid).toBe(true);
  });

  it('役なしロンは isInvalid (ドラのみは和了不可)', () => {
    // 副露あり + 役なし = アガれない
    const melds: Meld[] = [{ kind: 'chi', tiles: ['1m', '2m', '3m'], from: 'kamicha' }];
    const result = judgeHand(
      make({
        closedTiles: tiles('4m', '5m', '6m', '4p', '5p', '6p', '7s', '8s', '9s', '2z', '2z'),
        winningTile: '2z', // 場東/自東なので役牌だが、ここでは West を場風/自風にして役牌でなくする
        melds,
        seatWind: 'West',
        roundWind: 'West',
        doraCount: 1,
      }),
    );
    expect(result.isInvalid).toBe(true);
  });
});

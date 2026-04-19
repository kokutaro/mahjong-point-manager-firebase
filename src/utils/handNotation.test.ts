import { describe, expect, it } from 'vitest';
import type { ParsedHand } from '../types/analysis';
import { formatHandNotation, mapCallFromSymbol, parseHandNotation } from './handNotation';

describe('mapCallFromSymbol', () => {
  it('maps - to shimocha', () => {
    expect(mapCallFromSymbol('-')).toBe('shimocha');
  });

  it('maps = to toimen', () => {
    expect(mapCallFromSymbol('=')).toBe('toimen');
  });

  it('maps + to kamicha', () => {
    expect(mapCallFromSymbol('+')).toBe('kamicha');
  });
});

describe('parseHandNotation', () => {
  describe('門前手牌のみ', () => {
    it('萬子・索子・筒子・字牌を含む門前手牌をパースする', () => {
      const result = parseHandNotation('m123s456p789z11');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual([
        '1m',
        '2m',
        '3m',
        '4s',
        '5s',
        '6s',
        '7p',
        '8p',
        '9p',
        '1z',
        '1z',
      ]);
      expect(result.hand.tsumo).toBeUndefined();
      expect(result.hand.ron).toBeUndefined();
      expect(result.hand.melds).toEqual([]);
    });

    it('単一スーツの手牌をパースする', () => {
      const result = parseHandNotation('m1112345678999');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual([
        '1m',
        '1m',
        '1m',
        '2m',
        '3m',
        '4m',
        '5m',
        '6m',
        '7m',
        '8m',
        '9m',
        '9m',
        '9m',
      ]);
    });
  });

  describe('赤5を含むケース', () => {
    it('m455r6 をパースする（赤5は0mに変換）', () => {
      const result = parseHandNotation('m455r6');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['4m', '5m', '0m', '6m']);
    });

    it('筒子の赤5をパースする', () => {
      const result = parseHandNotation('p5r');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['0p']);
    });

    it('索子の赤5をパースする', () => {
      const result = parseHandNotation('s5r');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['0s']);
    });
  });

  describe('ツモ牌', () => {
    it('手牌末尾の _ をツモ牌としてパースする', () => {
      const result = parseHandNotation('s123m222s44_');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['1s', '2s', '3s', '2m', '2m', '2m', '4s']);
      expect(result.hand.tsumo).toBe('4s');
    });

    it('赤5をツモした場合', () => {
      const result = parseHandNotation('m1235r_');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['1m', '2m', '3m']);
      expect(result.hand.tsumo).toBe('0m');
    });
  });

  describe('ロン牌', () => {
    it('下家からのロン（-）をパースする', () => {
      const result = parseHandNotation('s123m222s44-');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['1s', '2s', '3s', '2m', '2m', '2m', '4s']);
      expect(result.hand.ron).toEqual({ tile: '4s', from: 'shimocha' });
    });

    it('対面からのロン（=）をパースする', () => {
      const result = parseHandNotation('s44=');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['4s']);
      expect(result.hand.ron).toEqual({ tile: '4s', from: 'toimen' });
    });

    it('上家からのロン（+）をパースする', () => {
      const result = parseHandNotation('s44+');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['4s']);
      expect(result.hand.ron).toEqual({ tile: '4s', from: 'kamicha' });
    });

    it('赤5をロンした場合', () => {
      const result = parseHandNotation('m455r-');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['4m', '5m']);
      expect(result.hand.ron).toEqual({ tile: '0m', from: 'shimocha' });
    });
  });

  describe('鳴きブロック', () => {
    it('チー（上家から）をパースする', () => {
      const result = parseHandNotation('m11,s123-');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.melds).toEqual([
        { kind: 'chi', tiles: ['1s', '2s', '3s'], from: 'kamicha' },
      ]);
    });

    it('ポン（上家から）をパースする', () => {
      const result = parseHandNotation('m11,z111+');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.melds).toEqual([
        { kind: 'pon', tiles: ['1z', '1z', '1z'], from: 'kamicha' },
      ]);
    });

    it('ポン（下家から）をパースする', () => {
      const result = parseHandNotation('m11,z111-');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.melds).toEqual([
        { kind: 'pon', tiles: ['1z', '1z', '1z'], from: 'shimocha' },
      ]);
    });

    it('明槓をパースする', () => {
      const result = parseHandNotation('m11,s2222=');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.melds).toEqual([
        { kind: 'minkan', tiles: ['2s', '2s', '2s', '2s'], from: 'toimen' },
      ]);
    });

    it('暗槓をパースする', () => {
      const result = parseHandNotation('m11,z2222');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.melds).toEqual([{ kind: 'ankan', tiles: ['2z', '2z', '2z', '2z'] }]);
    });

    it('加槓をパースする', () => {
      const result = parseHandNotation('m11,s222=2');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.melds).toEqual([
        { kind: 'kakan', tiles: ['2s', '2s', '2s', '2s'], from: 'toimen' },
      ]);
    });
  });

  describe('複合ケース', () => {
    it('手牌+ツモ+鳴き複数をパースする', () => {
      const result = parseHandNotation('s123m222s44_,z111-,z2222');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.concealed).toEqual(['1s', '2s', '3s', '2m', '2m', '2m', '4s']);
      expect(result.hand.tsumo).toBe('4s');
      expect(result.hand.melds).toHaveLength(2);
      expect(result.hand.melds[0]).toEqual({
        kind: 'pon',
        tiles: ['1z', '1z', '1z'],
        from: 'shimocha',
      });
      expect(result.hand.melds[1]).toEqual({
        kind: 'ankan',
        tiles: ['2z', '2z', '2z', '2z'],
      });
    });

    it('ロン+鳴きをパースする', () => {
      const result = parseHandNotation('m123p456s78s9+,z111-');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.ron).toEqual({ tile: '9s', from: 'kamicha' });
      expect(result.hand.melds).toHaveLength(1);
    });

    it('赤5を含む鳴きをパースする', () => {
      const result = parseHandNotation('m11,p5r55-');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.hand.melds).toEqual([
        { kind: 'pon', tiles: ['0p', '5p', '5p'], from: 'shimocha' },
      ]);
    });
  });

  describe('エラーケース', () => {
    it('空文字列はエラーを返す', () => {
      const result = parseHandNotation('');
      expect(result.success).toBe(false);
    });

    it('不正な文字を含む入力はエラーを返す', () => {
      const result = parseHandNotation('x123');
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.position).toBe(0);
    });

    it('z8以上の字牌はエラーを返す', () => {
      const result = parseHandNotation('z8');
      expect(result.success).toBe(false);
    });

    it('m0 はエラーを返す（赤5は5rで表記）', () => {
      const result = parseHandNotation('m0');
      expect(result.success).toBe(false);
    });

    it('スーツ記号のみはエラーを返す', () => {
      const result = parseHandNotation('m');
      expect(result.success).toBe(false);
    });
  });
});

describe('formatHandNotation', () => {
  it('門前手牌のみをフォーマットする', () => {
    const hand: ParsedHand = {
      concealed: ['1m', '2m', '3m', '4s', '5s', '6s'],
      melds: [],
    };
    expect(formatHandNotation(hand)).toBe('m123s456');
  });

  it('ツモ牌を含む手牌をフォーマットする', () => {
    const hand: ParsedHand = {
      concealed: ['1s', '2s', '3s', '2m', '2m', '2m'],
      tsumo: '4s',
      melds: [],
    };
    expect(formatHandNotation(hand)).toBe('m222s1234_');
  });

  it('ロン牌を含む手牌をフォーマットする', () => {
    const hand: ParsedHand = {
      concealed: ['4s'],
      ron: { tile: '4s', from: 'shimocha' },
      melds: [],
    };
    expect(formatHandNotation(hand)).toBe('s44-');
  });

  it('鳴きを含む手牌をフォーマットする', () => {
    const hand: ParsedHand = {
      concealed: ['1m', '1m'],
      melds: [
        { kind: 'pon', tiles: ['1z', '1z', '1z'], from: 'shimocha' },
        { kind: 'ankan', tiles: ['2z', '2z', '2z', '2z'] },
      ],
    };
    expect(formatHandNotation(hand)).toBe('m11,z111-,z2222');
  });

  it('赤5を含む手牌をフォーマットする', () => {
    const hand: ParsedHand = {
      concealed: ['4m', '5m', '0m', '6m'],
      melds: [],
    };
    expect(formatHandNotation(hand)).toBe('m455r6');
  });

  it('加槓を含む手牌をフォーマットする', () => {
    const hand: ParsedHand = {
      concealed: ['1m', '1m'],
      melds: [{ kind: 'kakan', tiles: ['2s', '2s', '2s', '2s'], from: 'toimen' }],
    };
    expect(formatHandNotation(hand)).toBe('m11,s222=2');
  });

  describe('Round-trip テスト', () => {
    const roundTripCases = [
      'm123s456p789z11',
      'm455r6',
      'm222s1234_',
      's44-',
      'm11,z111-,z2222',
      'm222s1234_,z111-,z2222',
      'm11,s222=2',
    ];

    for (const notation of roundTripCases) {
      it(`"${notation}" をフォーマット→再パース→再フォーマットで安定する`, () => {
        const first = parseHandNotation(notation);
        expect(first.success).toBe(true);
        if (!first.success) return;

        const formatted = formatHandNotation(first.hand);
        const second = parseHandNotation(formatted);
        expect(second.success).toBe(true);
        if (!second.success) return;

        const reformatted = formatHandNotation(second.hand);
        expect(reformatted).toBe(formatted);
      });
    }
  });
});

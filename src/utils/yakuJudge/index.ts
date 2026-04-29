import { YAKUMAN_DEFS, YAKU_DEFS } from '../../types/analysis';
import {
  decomposeChiitoitsu,
  decomposeKokushi,
  decomposeStandard,
  type DecomposedHand,
} from './decompose';
import { calculateFu } from './fu';
import {
  detectChiitoitsu,
  detectKokushi,
  detectStandardYaku,
  type DetectedYaku,
  type DetectedYakuman,
} from './yakuDetect';
import type { HandInput, YakuJudgeResult, YakuJudgeResultEntry } from './types';

export type { HandFlags, HandInput, YakuJudgeResult, YakuJudgeResultEntry } from './types';
export { DEFAULT_HAND_FLAGS } from './types';

/**
 * 入力された手牌から役・翻数・符を自動判定する。
 *
 * 仕様:
 * - 役満が成立する場合、通常役は付与されず、翻数フィールドは 0、`yakumanMultiplier` に倍数。
 * - 通常役は最大翻数を取る面子分解パターンを採用。
 * - ドラ・赤ドラ・状況役 (立直/一発/嶺上/搶槓/海底/河底/天和/地和) はフラグ入力からそのまま追加。
 * - 形が和了形でない場合は `isInvalid: true` を返す。
 */
export const judgeHand = (input: HandInput): YakuJudgeResult => {
  const warnings: string[] = [];
  // 槓子は手牌計上では3枚扱い (4枚目は王牌補充扱い)。
  // よって closedTiles + 1 (winningTile) + 3 * melds.length === 14 が成立すべき。
  const totalTiles = input.closedTiles.length + 1 + input.melds.length * 3;
  if (totalTiles !== 14) {
    return invalid(`手牌の合計枚数が不正です (${totalTiles} 枚)`);
  }

  const isMenzen = input.melds.every((m) => m.kind === 'ankan');

  // 国士・七対子を試す
  const kokushi = decomposeKokushi(input.closedTiles, input.winningTile, input.melds);
  if (kokushi) {
    const ym = detectKokushi(kokushi);
    return finalizeYakuman(ym, input, warnings);
  }
  const chiitoi = decomposeChiitoitsu(input.closedTiles, input.winningTile, input.melds);

  // 標準形分解
  const standardDecomps = decomposeStandard(
    input.closedTiles,
    input.winningTile,
    input.melds,
    input.isTsumo,
  );

  if (standardDecomps.length === 0 && !chiitoi) {
    return invalid('和了形として分解できません');
  }

  // 各分解を評価し、最良 (役満 > 翻数 > 符) を採用
  type Candidate = {
    yakuman: DetectedYakuman[];
    yaku: DetectedYaku[];
    fu: number;
    decomp: DecomposedHand | null;
    isPinfuShape: boolean;
  };

  const candidates: Candidate[] = [];

  for (const d of standardDecomps) {
    const detection = detectStandardYaku({
      decomp: d,
      isMenzen,
      seatWind: input.seatWind,
      roundWind: input.roundWind,
    });
    const fuResult = calculateFu(d, input.isTsumo, isMenzen, input.seatWind, input.roundWind);
    candidates.push({
      yakuman: detection.yakuman,
      yaku: detection.yaku,
      fu: fuResult.fu,
      decomp: d,
      isPinfuShape: fuResult.isPinfuShape,
    });
  }

  if (chiitoi) {
    const detection = detectChiitoitsu(chiitoi, { isMenzen });
    candidates.push({
      yakuman: detection.yakuman,
      yaku: detection.yaku,
      fu: 25,
      decomp: null,
      isPinfuShape: false,
    });
  }

  // 役満候補があるならそれを優先
  const yakumanCandidates = candidates.filter((c) => c.yakuman.length > 0);
  if (yakumanCandidates.length > 0) {
    // 倍数の合計が最大のものを選ぶ
    yakumanCandidates.sort(
      (a, b) =>
        b.yakuman.reduce((s, y) => s + y.multiplier, 0) -
        a.yakuman.reduce((s, y) => s + y.multiplier, 0),
    );
    return finalizeYakuman(yakumanCandidates[0].yakuman, input, warnings);
  }

  // 通常役: 状況役/立直/一発/ドラ等を付与した上で han が最大、同点なら fu が大きい候補を選ぶ
  const evaluated = candidates.map((c) => {
    const extras = collectStateYakuAndDora(input, isMenzen);
    const totalHan = c.yaku.reduce((s, y) => s + y.han, 0) + extras.reduce((s, e) => s + e.han, 0);
    return { ...c, extras, totalHan };
  });

  evaluated.sort((a, b) => {
    if (b.totalHan !== a.totalHan) return b.totalHan - a.totalHan;
    return b.fu - a.fu;
  });

  const best = evaluated[0];

  // 役なし判定 (ドラのみ等)
  if (best.yaku.length === 0 && best.extras.every((e) => e.id === 'dora' || e.id === 'akaDora')) {
    warnings.push('役がありません (ドラのみは和了不可)');
    return invalidResult(warnings);
  }

  // 平和ツモ補正: detectStandardYaku では平和を付けるが、
  // ツモ時の門前清自摸和も別途付くため、両方加算済み (extras 経由で menzenTsumo)。

  const entries: YakuJudgeResultEntry[] = [
    ...best.yaku.map((y) => ({
      id: y.id,
      label: YAKU_DEFS[y.id].label,
      han: y.han,
    })),
    ...best.extras,
  ];

  // 表示順整理: 翻数降順
  entries.sort((a, b) => b.han - a.han);

  return {
    yaku: entries,
    yakumanMultiplier: 0,
    han: best.totalHan,
    fu: best.fu,
    warnings,
    isInvalid: false,
  };
};

const collectStateYakuAndDora = (input: HandInput, isMenzen: boolean): YakuJudgeResultEntry[] => {
  const out: YakuJudgeResultEntry[] = [];
  const f = input.flags;
  if (f.doubleRiichi) {
    out.push({ id: 'doubleRiichi', label: YAKU_DEFS.doubleRiichi.label, han: 2 });
  } else if (f.riichi) {
    out.push({ id: 'riichi', label: YAKU_DEFS.riichi.label, han: 1 });
  }
  if (input.isTsumo && isMenzen) {
    out.push({ id: 'menzenTsumo', label: YAKU_DEFS.menzenTsumo.label, han: 1 });
  }
  // 状況役 (1翻)
  if (f.ippatsu && (f.riichi || f.doubleRiichi)) {
    out.push({ id: 'ippatsu', label: '一発', han: 1 });
  }
  if (f.rinshan) out.push({ id: 'rinshan', label: '嶺上開花', han: 1 });
  if (f.chankan) out.push({ id: 'chankan', label: '搶槓', han: 1 });
  if (f.haitei) out.push({ id: 'haitei', label: '海底摸月', han: 1 });
  if (f.houtei) out.push({ id: 'houtei', label: '河底撈魚', han: 1 });
  if (input.doraCount > 0) {
    out.push({ id: 'dora', label: 'ドラ', han: input.doraCount });
  }
  if (input.akaDoraCount > 0) {
    out.push({ id: 'akaDora', label: '赤ドラ', han: input.akaDoraCount });
  }
  return out;
};

const finalizeYakuman = (
  ym: DetectedYakuman[],
  input: HandInput,
  warnings: string[],
): YakuJudgeResult => {
  // 天和/地和は役満入力フラグから追加
  const extras: DetectedYakuman[] = [];
  if (input.flags.tenho) extras.push({ id: 'tenhou', multiplier: 1 });
  if (input.flags.chiho) extras.push({ id: 'chiihou', multiplier: 1 });
  const all = [...ym, ...extras];
  const multiplier = all.reduce((s, y) => s + y.multiplier, 0);
  const entries: YakuJudgeResultEntry[] = all.map((y) => ({
    id: y.id,
    label: YAKUMAN_DEFS[y.id].label,
    han: 13 * y.multiplier,
    yakumanMultiplier: y.multiplier,
  }));
  return {
    yaku: entries,
    yakumanMultiplier: multiplier,
    han: 0,
    fu: 0,
    warnings,
    isInvalid: false,
  };
};

const invalid = (msg: string): YakuJudgeResult => invalidResult([msg]);

const invalidResult = (warnings: string[]): YakuJudgeResult => ({
  yaku: [],
  yakumanMultiplier: 0,
  han: 0,
  fu: 0,
  warnings,
  isInvalid: true,
});

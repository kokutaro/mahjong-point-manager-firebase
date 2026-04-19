export type Wind = 'East' | 'South' | 'West' | 'North';

type SuitTileDigit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type HonorTileDigit = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TileCode =
  | `${SuitTileDigit}m`
  | `${SuitTileDigit}p`
  | `${SuitTileDigit}s`
  | `${HonorTileDigit}z`
  | '0m'
  | '0p'
  | '0s';

export type RelativePosition = 'kamicha' | 'toimen' | 'shimocha';

export type Meld =
  | { kind: 'chi'; tiles: [TileCode, TileCode, TileCode]; from: 'kamicha' }
  | { kind: 'pon'; tiles: [TileCode, TileCode, TileCode]; from: RelativePosition }
  | { kind: 'minkan'; tiles: [TileCode, TileCode, TileCode, TileCode]; from: RelativePosition }
  | { kind: 'ankan'; tiles: [TileCode, TileCode, TileCode, TileCode] }
  | { kind: 'kakan'; tiles: [TileCode, TileCode, TileCode, TileCode]; from: RelativePosition };

export type WaitShape =
  | 'ryanmen'
  | 'penchan'
  | 'kanchan'
  | 'shanpon'
  | 'tanki'
  | 'nobetan'
  | 'sanmenchan'
  | 'multi-other';

export type AnalysisEventType = 'win' | 'deal-in' | 'tenpai-draw';

export type SpecialEnd = 'haitei' | 'houtei' | 'rinshan' | 'chankan';

export interface WaitShapeDefinition {
  label: string;
}

export const WAIT_SHAPE_DEFS = {
  ryanmen: { label: '両面' },
  penchan: { label: '辺張' },
  kanchan: { label: '嵌張' },
  shanpon: { label: '双碰' },
  tanki: { label: '単騎' },
  nobetan: { label: '延べ単' },
  sanmenchan: { label: '三面張' },
  'multi-other': { label: '多面張その他' },
} as const satisfies Record<WaitShape, WaitShapeDefinition>;

export const WAIT_SHAPES = Object.keys(WAIT_SHAPE_DEFS) as WaitShape[];

export type YakuGroup = '1han' | '2han' | '3han' | '6han';

export interface YakuDefinition {
  label: string;
  han: number;
  group: YakuGroup;
}

export const YAKU_DEFS = {
  riichi: { label: '立直', han: 1, group: '1han' },
  doubleRiichi: { label: 'ダブル立直', han: 2, group: '2han' },
  menzenTsumo: { label: '門前清自摸和', han: 1, group: '1han' },
  pinfu: { label: '平和', han: 1, group: '1han' },
  tanyao: { label: 'タンヤオ', han: 1, group: '1han' },
  yakuhaiRoundWind: { label: '役牌: 場風', han: 1, group: '1han' },
  yakuhaiSeatWind: { label: '役牌: 自風', han: 1, group: '1han' },
  yakuhaiHaku: { label: '役牌: 白', han: 1, group: '1han' },
  yakuhaiHatsu: { label: '役牌: 發', han: 1, group: '1han' },
  yakuhaiChun: { label: '役牌: 中', han: 1, group: '1han' },
  iipeikou: { label: '一盃口', han: 1, group: '1han' },
  sanshokuDoujun: { label: '三色同順', han: 2, group: '2han' },
  ikkitsuukan: { label: '一気通貫', han: 2, group: '2han' },
  chanta: { label: '混全帯么九', han: 2, group: '2han' },
  chiitoitsu: { label: '七対子', han: 2, group: '2han' },
  toitoi: { label: '対々和', han: 2, group: '2han' },
  sanankou: { label: '三暗刻', han: 2, group: '2han' },
  sanshokuDoukou: { label: '三色同刻', han: 2, group: '2han' },
  sankantsu: { label: '三槓子', han: 2, group: '2han' },
  shousangen: { label: '小三元', han: 2, group: '2han' },
  honroutou: { label: '混老頭', han: 2, group: '2han' },
  junchan: { label: '純全帯么九', han: 3, group: '3han' },
  honitsu: { label: '混一色', han: 3, group: '3han' },
  ryanpeikou: { label: '二盃口', han: 3, group: '3han' },
  chinitsu: { label: '清一色', han: 6, group: '6han' },
} as const satisfies Record<string, YakuDefinition>;

export type YakuId = keyof typeof YAKU_DEFS;

export const YAKU_IDS = Object.keys(YAKU_DEFS) as YakuId[];

export interface YakumanDefinition {
  label: string;
  multiplier: number;
}

export const YAKUMAN_DEFS = {
  kokushiMusou: { label: '国士無双', multiplier: 1 },
  kokushiMusou13Wait: { label: '国士無双十三面待ち', multiplier: 2 },
  suuankou: { label: '四暗刻', multiplier: 1 },
  suuankouTanki: { label: '四暗刻単騎', multiplier: 2 },
  daisangen: { label: '大三元', multiplier: 1 },
  shousuushii: { label: '小四喜', multiplier: 1 },
  daisuushii: { label: '大四喜', multiplier: 2 },
  tsuuiisou: { label: '字一色', multiplier: 1 },
  ryuuiisou: { label: '緑一色', multiplier: 1 },
  chinroutou: { label: '清老頭', multiplier: 1 },
  chuurenPoutou: { label: '九蓮宝燈', multiplier: 1 },
  junseiChuurenPoutou: { label: '純正九蓮宝燈', multiplier: 2 },
  suukantsu: { label: '四槓子', multiplier: 1 },
  tenhou: { label: '天和', multiplier: 1 },
  chiihou: { label: '地和', multiplier: 1 },
} as const satisfies Record<string, YakumanDefinition>;

export type YakumanId = keyof typeof YAKUMAN_DEFS;

export const YAKUMAN_IDS = Object.keys(YAKUMAN_DEFS) as YakumanId[];

export interface AnalysisEntry {
  id: string;
  uid: string;
  source: AnalysisSource;
  context: AnalysisContext;
  hand: AnalysisHand;
  dora: AnalysisDora;
  yaku: AnalysisYaku;
  notes: string;
  createdAt: number | object;
  updatedAt: number | object;
}

export interface AnalysisSource {
  kind: 'room' | 'competition';
  roomId?: string;
  competitionId?: string;
  gameResultId?: string;
  handLogId: string;
}

export interface AnalysisContext {
  round: { wind: Wind; number: number; honba: number };
  seatWind: Wind;
  roundWind: Wind;
  eventType: AnalysisEventType;
  isDealer: boolean;
}

export interface AnalysisHand {
  concealed: TileCode[];
  melds: Meld[];
  winningTile?: TileCode;
  wait?: WaitShape[];
}

export interface AnalysisDora {
  doraIndicators: TileCode[];
  uraIndicators: TileCode[];
  kanDoraIndicators: TileCode[];
  kanUraIndicators: TileCode[];
  redFiveCount?: number;
}

export interface AnalysisYaku {
  list?: YakuId[];
  yakuman?: YakumanId[];
  ippatsu: boolean;
  riichi: 'none' | 'normal' | 'double';
  special: SpecialEnd | null;
  han?: number;
  fu?: number;
}

export type CallFromSymbol = '-' | '=' | '+';

export type HandNotationString = string & { readonly __brand: unique symbol };

export interface ParsedRon {
  tile: TileCode;
  from: RelativePosition;
}

export interface ParsedHand {
  concealed: TileCode[];
  tsumo?: TileCode;
  ron?: ParsedRon;
  melds: Meld[];
}

# 麻雀牌姿表記仕様

## 1. 目的 / 概要

- 各イベントごとに入力できる詳細分析用の牌姿について、入力を容易にする

## 2. データモデル

TypeScript型。従来の単牌配列表現に加え、短縮表記・鳴き・ツモ・ロンを安全に扱うための型を拡張する。

```ts
// tiles.ts
export type TileSuit = 'm' | 'p' | 's' | 'z';
export type NumberSuit = 'm' | 'p' | 's';
export type TileCode =
  | `${NumberSuit}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | `${NumberSuit}5r` // 赤5
  | `z${1 | 2 | 3 | 4 | 5 | 6 | 7}`; // 東南西北白發中

// 牌姿短縮表記: 実体は string だが、Zod などで妥当性検証する前提のブランド型
export type HandNotationString = string & { readonly __brand: unique symbol };

// 鳴き方向（記号・論理名の両方を用意）
export type CallFromSymbol = '-' | '=' | '+'; // -:下家, =:対面, +:上家
export type CallFrom = 'shimo' | 'toimen' | 'kami';

// 面子（副露/槓子を含む）
export type KanSubtype = 'closed' | 'open' | 'added'; // 暗槓/明槓/加槓
export type Meld =
  | {
      kind: 'chi';
      suit: NumberSuit;
      tiles: readonly [TileCode, TileCode, TileCode]; // 連続3枚
      from: CallFrom; // （実運用上は常に上家）
    }
  | {
      kind: 'pon';
      suit: TileSuit;
      tiles: readonly [TileCode, TileCode, TileCode]; // 同一3枚
      from: CallFrom;
    }
  | {
      kind: 'kan';
      suit: TileSuit;
      tiles: readonly [TileCode, TileCode, TileCode, TileCode]; // 同一4枚
      subtype: KanSubtype;
      from?: CallFrom; // 明槓/加槓で必須、暗槓は省略
    };

// 文字列表記の解析結果
export type ParsedHand = {
  concealed: TileCode[]; // 手牌（ツモを含まない）
  tsumo?: TileCode; // ツモ牌（手牌ブロック末尾の `_` で示す）
  melds: Meld[]; // 鳴き・槓子
};

// 代表形の表現は「単牌配列」または「短縮表記」のいずれかを許容する
export type HaiExpression =
  | {
      tiles: TileCode[]; // 手牌例（14枚想定だが、概要表現でも可）
      notation?: never;
    }
  | {
      notation: HandNotationString; // 例: "s123m222s44_,z111-,z2222"
      tiles?: never;
    };

// ユーティリティの関数シグネチャ
export type HandParseResult = ParsedHand;
export function parseHandNotation(input: string): HandParseResult;
export function formatHandNotation(hand: ParsedHand): HandNotationString;
export function mapCallFromSymbol(sym: CallFromSymbol): CallFrom;
```

### 3.2. 牌姿短縮表記（文字列フォーマット）

- 目的: 牌姿の文字数を削減し、人が読み書きしやすい表記を提供する。
- 基本構造: 種類記号の直後に連続した数字で表記する。
  - 種類記号: `m`（萬子）/ `p`（筒子）/ `s`（索子）/ `z`（字牌）
  - 数字: `m/p/s` は `1..9`、`z` は `1..7`（東南西北白發中）
  - 同一スーツ内での同じ牌の複数枚は、同じ数字を繰り返す
  - 同一スーツ内の並び順は昇順とする（例外: 加工や解析には不要だが、人手編集時の推奨）
- 例:
  - `m123s123p123z1122`（萬123・索123・筒123・東東 南南）
- 赤5の表記: 本設計書の牌コード定義に従い `5r` を許容する（例: `m455r6`）。

留意:

- `z1..z7` はそれぞれ `東, 南, 西, 北, 白, 發, 中` に対応。
- スーツは存在するもののみを列挙し、省略可（例: 筒子が無い場合 `p...` は現れない）。

### 3.3. 鳴き・ツモ牌の表記

- 区切り: 手牌・風露面子（鳴き）・ツモをカンマで区切って列挙する。
  - 先頭が手牌ブロック。鳴きは以降に複数ブロック出現可。
  - ツモは手牌ブロック末尾のアンダースコア `_` で表す。`_` の直前の数字がツモ牌。
  - ロンは手牌ブロック末尾の手出し記号で表す。手出し記号の直前の数字がロン牌。
    - `-`: 下家（しもちゃ）
    - `=`: 対面（トイメン）
    - `+`: 上家（かみちゃ）
- 誰から鳴いたかの識別: 風露面子ブロック末尾に記号を付ける。
  - `-`: 下家（しもちゃ）
  - `=`: 対面（トイメン）
  - `+`: 上家（かみちゃ）
- 構成要素の表記:
  - チー/ポン: スーツ記号＋数字列（例: `s123`, `m777`）に、鳴き元の記号を末尾付与（例: `s123-`, `m777+`）
  - 暗槓: スーツ記号＋同一数字4つ（記号なし）例: `z2222`
  - 明槓: スーツ記号＋同一数字4つ＋鳴き元記号 例: `s2222=`（対面から2sをカン）
  - 加槓: 既存のポン表記（鳴き元記号付き）の直後に追加牌の数字を1つ付加 例: `s222=2`（対面から2sをポン後に加槓）

例:

- 手牌・風露・ツモを含む例: `s123m222s44_,z111-,z2222`
  - 手牌: `s123m222s44_`（ツモは `4s`）
  - 鳴き1: `z111-`（下家から東をポン）
  - 鳴き2: `z2222`（南の暗槓）
- 鳴き方向の例:
  - 上家から2sをポン: `s222+`
  - 対面から2sをポン: `s222=`
  - 下家から2sをポン: `s222-`

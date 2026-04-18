# 詳細分析機能 仕様書

> 自分の麻雀を局単位で振り返り、手牌・待ち形・役構成・ドラ等の詳細データを残せるようにし、将来的な分析（傾向把握・改善点抽出）の土台を作る。

## 1. 目的・背景

各和了イベント時に、手牌の状況、一発の有無、待ちの形（リャンメン／ペンチャン／カンチャン／シャボ／単騎／変則多面など）、ドラ・裏ドラ・カンドラ・カン裏ドラ、赤5枚数、手役、その他フリーテキストなどを構造化して記録できるようにする。和了時だけでなく、後で自由なタイミング（対局終了後を含む）で編集可能とする。

本仕様書のスコープは **入力・閲覧・編集** までを Phase 1 として定義する。集計・グラフ等の本格的な「分析」機能は Phase 2 以降の別Issueで切り出す。

## 2. スコープ

### 2.1 対象モード

- 通常対局（`rooms` コレクション）
- 競技モード（`competitions` コレクション）

### 2.2 記録対象イベント

| イベント種別  | 説明                                                 |
| ------------- | ---------------------------------------------------- |
| `win`         | 自分の和了                                           |
| `deal-in`     | 自分が放銃した局（他家和了。自分視点のメモを残す）   |
| `tenpai-draw` | 自分が流局時テンパイだった局（聴牌手牌・待ちを記録） |

- Phase 1 では新しいイベントを手動作成しない。既存の `HandLog` / 対局履歴に記録済みのイベントを選択し、そのイベントに対して `AnalysisEntry` を紐付けて作成する。
- `AnalysisEntry.context.eventType` は選択した `HandLog` の内容から自動判定し、入力UI上での手動変更は不可とする。

### 2.3 所有モデル

- **個人専用**。`userAnalyses/{uid}/entries/{entryId}` のサブコレクションに格納し、本人以外からは閲覧・編集できない。
- 同卓者の手牌・メモは原則記録対象外（自分視点のメモのみ）。

### 2.4 スコープ外（Phase 1）

- 集計・グラフ・他者比較
- 共有／公開機能
- AIによる自動牌姿読み取り
- 旧 `HandLog` の自動マイグレーション（既存の和了に対しては「空のエントリを後から作成」で対応）

## 3. データモデル

### 3.1 Firestore コレクション

```
userAnalyses/{uid}/entries/{entryId}
```

### 3.2 ドキュメント構造（型: `AnalysisEntry`）

`src/types/analysis.ts` を新設して以下を定義する。

```ts
export interface AnalysisEntry {
  id: string;
  uid: string; // オーナー。Firestore Rules で照合
  source: AnalysisSource;
  context: AnalysisContext;
  hand: AnalysisHand;
  dora: AnalysisDora;
  yaku: AnalysisYaku;
  notes: string; // フリーテキスト
  createdAt: number;
  updatedAt: number;
}

export interface AnalysisSource {
  kind: 'room' | 'competition';
  roomId?: string;
  competitionId?: string;
  gameResultId?: string; // 半荘単位のID
  handLogId: string; // HandLog.id と紐付け
}

export interface AnalysisContext {
  round: { wind: Wind; number: number; honba: number };
  seatWind: Wind; // 自家風
  roundWind: Wind; // 場風
  eventType: 'win' | 'deal-in' | 'tenpai-draw'; // HandLog から自動決定
  isDealer: boolean;
}

export interface AnalysisHand {
  concealed: TileCode[]; // 手牌（門前部分）。13 または 14 枚
  melds: Meld[]; // 鳴き
  winningTile?: TileCode; // 和了牌（win / deal-in 時）
  wait: WaitShape[]; // 複数選択可
}

export interface AnalysisDora {
  doraIndicators: TileCode[];
  uraIndicators: TileCode[];
  kanDoraIndicators: TileCode[];
  kanUraIndicators: TileCode[];
  redFiveCount: number;
}

export interface AnalysisYaku {
  list: YakuId[]; // 立直/平和/タンヤオ等
  yakuman: YakumanId[]; // 国士/四暗刻/大三元等
  ippatsu: boolean;
  riichi: 'none' | 'normal' | 'double';
  special: SpecialEnd | null; // 海底/河底/嶺上/槍槓
  han?: number; // HandLog から自動同期、上書き可
  fu?: number; // 同上
}
```

### 3.3 補助型

#### `TileCode`（MPSZ 表記）

```ts
export type TileCode =
  | `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}m`
  | `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}p`
  | `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}s`
  | `${1 | 2 | 3 | 4 | 5 | 6 | 7}z`
  | '0m'
  | '0p'
  | '0s'; // 0 は赤5
```

- 字牌の対応: `1z`=東 / `2z`=南 / `3z`=西 / `4z`=北 / `5z`=白 / `6z`=發 / `7z`=中。

#### `Meld`

```ts
export type Meld =
  | { kind: 'chi'; tiles: [TileCode, TileCode, TileCode]; from: 'kamicha' }
  | { kind: 'pon'; tiles: [TileCode, TileCode, TileCode]; from: RelativePosition }
  | { kind: 'minkan'; tiles: [TileCode, TileCode, TileCode, TileCode]; from: RelativePosition }
  | { kind: 'ankan'; tiles: [TileCode, TileCode, TileCode, TileCode] };

export type RelativePosition = 'kamicha' | 'toimen' | 'shimocha';
```

#### `WaitShape`

```ts
export type WaitShape =
  | 'ryanmen'
  | 'penchan'
  | 'kanchan'
  | 'shanpon'
  | 'tanki'
  | 'nobetan'
  | 'sanmenchan'
  | 'multi-other';
```

#### `YakuId` / `YakumanId` / `SpecialEnd`

- `YakuId`: 立直／門前清自摸和／平和／タンヤオ／役牌（場風／自風／白／發／中）／一盃口／三色同順／一気通貫／混全帯么九／七対子／対々和／三暗刻／三色同刻／三槓子／小三元／混老頭／純全帯么九／混一色／二盃口／清一色／ダブル立直 等を列挙。
- `YakumanId`: 国士無双（13面）／四暗刻（単騎）／大三元／小四喜／大四喜／字一色／緑一色／清老頭／九蓮宝燈（純正）／四槓子／天和／地和 等。
- `SpecialEnd`: `'haitei' | 'houtei' | 'rinshan' | 'chankan'`。

正式な enum 値の一覧は `src/types/analysis.ts` 内の `YAKU_DEFS` / `YAKUMAN_DEFS` 定数で日本語表示名と翻数付きで定義する。

### 3.4 既存 `HandLog` への影響

- `HandLog`（[src/types/index.ts](../src/types/index.ts)）の構造は **変更しない**。共有データを汚染せず、`AnalysisEntry.source.handLogId` で論理的に結合する。
- 既存 HandLog から `han` / `fu` / `yaku 名称` が取得可能であれば、初回入力時の初期値として `AnalysisEntry` に流し込む（自動下書き）。

## 4. 画面・UI

### 4.1 共通モーダル `AnalysisDetailModal`

モバイルファーストで縦スクロールの 1 画面構成。セクション順序:

1. **対象イベント概要**: 局情報、和了/放銃/流局テンパイ種別、和了者/放銃者などを読み取り専用で表示
2. **手牌入力**:
   - 萬子 / 筒子 / 索子 / 字牌 のタブ切替
   - 牌アイコンタップで追加、選択済み手牌の牌タップで削除
   - 赤5トグル
   - 13 枚 or 14 枚（鳴き含む）でのバリデーション
3. **鳴き**: メルド追加ボタン → チー / ポン / 明槓 / 暗槓を選択 → 牌指定
4. **和了牌**: `win` / `deal-in` 時のみ。手牌の中から1枚指定
5. **待ち形**: チップ複数選択
6. **ドラ**: 表ドラ / 裏ドラ / カン表 / カン裏 を別グループで指定。赤5枚数を数値入力
7. **役**:
   - 1飜 / 2飜 / 3飜 / 6飜 / 役満 のセクション分けチェックリスト
   - 一発 / 海底 / 河底 / 嶺上 / 槍槓 / ダブル立直 / 立直 のトグル群
8. **メモ**: テキストエリア（複数行、最大 2000 文字）
9. **アクション**: 保存 / キャンセル / 削除（編集時のみ）

### 4.2 バリデーション

- 必須は **紐付け先イベントの選択** のみ。
- 手牌枚数や役整合性は警告レベル（保存は可能、ハイライト表示）。
- 段階的入力を許容し、未完成のままでも保存できる（後で追記する運用）。

### 4.3 入力導線

| 起点                                                    | 動作                                                                                                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ScoringModal` 確定直後                                 | 和了履歴はこの時点で `HandLog` として作成済みであるため、`SnackbarContext` で「詳細分析を残しますか？」トーストを表示。タップで、直前に作成された `HandLog` に紐付いた `AnalysisDetailModal` を直接開く。 |
| `MatchPage` / `CompetitionTablePage` の局履歴行         | 各 `HandLog` 行に「📝」アイコンを表示し、対象イベントに紐付く詳細入力モーダルを開く。                                                                                                                     |
| `SessionDetailPage` / `CompetitionReportPage`           | 当該対局で発生したイベント一覧を表示し、クリックした `HandLog` に対する詳細入力・編集を行う。                                                                                                             |
| 専用ページ `AnalysisListPage`（新設、パス `/analysis`） | 既存の `AnalysisEntry` 一覧を表示。行タップで読取モード起動、編集ボタンで編集モードに切替。                                                                                                               |

### 4.4 対局後のイベント一覧導線

- 対局終了後に詳細を入力する場合は、新規エントリを空で作成するのではなく、対象の対局に紐付く `HandLog` 一覧を先に表示する。
- 一覧には、局情報、イベント種別、和了者、放銃者、点数移動の要約、既に `AnalysisEntry` が存在するかどうかを表示する。
- ユーザーがイベントをクリックすると、その `HandLog` をコンテキストとして `AnalysisDetailModal` を開く。
- 既に `AnalysisEntry` が存在する場合は編集モード、存在しない場合は新規作成モードで開く。
- 一覧は少なくとも `SessionDetailPage` と `CompetitionReportPage` から利用できること。必要に応じて専用のイベント選択ダイアログとして共通化する。

### 4.5 ナビゲーション

- `TopPage` または `DashboardPage` の主要メニューに「分析ノート」エントリを追加し `/analysis` へ遷移。

### 4.6 一覧ページ（Phase 1 簡易版）

- 自分の `AnalysisEntry` を `updatedAt` 降順で表示。
- 行表示: 日時 / モード（room/competition）/ 場風・局・本場 / イベント種別 / 役の先頭2件 / メモ冒頭。
- フィルタは Phase 1 では「期間」「イベント種別」のみ。詳細フィルタ（役・待ち形）は Phase 2。

## 5. 牌表示方針

- Phase 1 では外部 SVG アセットは導入せず、`src/components/ui/TileImage.tsx` で牌コードから牌面を描画する CSS ベースの UI コンポーネントを採用する。
- この方針により、追加の画像ライセンス表記や `docs/credits.md` の新設は不要とする。
- 共通コンポーネント `src/components/ui/TileImage.tsx`:
  - props: `code: TileCode`, `size?: 'sm' | 'md' | 'lg'`, `selected?: boolean`, `onClick?: () => void`
  - CSS Modules + `src/visuals/tokens.css` のサイズトークンを使用。
- 牌セレクタ用の配列ヘルパは `src/utils/tiles.ts` にまとめる。
- 将来的に実画像アセットへ差し替える場合も、各画面からは `TileImage` を経由して利用することで差分を局所化する。

## 6. データアクセス層

### 6.1 サービス `src/services/analysisService.ts`

```ts
export function subscribeAnalysisEntries(
  uid: string,
  callback: (entries: AnalysisEntry[]) => void,
): Unsubscribe;

export function getAnalysisEntry(uid: string, entryId: string): Promise<AnalysisEntry | null>;

export function findAnalysisEntryByHandLog(
  uid: string,
  source: AnalysisSource,
): Promise<AnalysisEntry | null>;

export function saveAnalysisEntry(uid: string, entry: AnalysisEntry): Promise<void>; // setDoc(..., { merge: true })

export function deleteAnalysisEntry(uid: string, entryId: string): Promise<void>;
```

実装パターンは [src/services/userSettingsService.ts](../src/services/userSettingsService.ts) を踏襲する。

### 6.2 フック

- `src/hooks/useAnalysisEntries.ts` — `subscribeAnalysisEntries` でリアルタイム購読、配列で返却。
- `src/hooks/useAnalysisEntry.ts` — 単一エントリの取得 + ドラフト編集状態管理。
  - `react-hooks/set-state-in-effect` 対応として、props 同期を `useEffect` に書かず「draft state（null時はprops派生）」パターンを使う。

## 7. Firestore セキュリティルール

[firestore.rules](../firestore.rules) に以下を追記:

```
match /userAnalyses/{uid} {
  match /entries/{entryId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}
```

インデックスは `updatedAt desc` の単一フィールドで初期実装は十分。複合フィルタ追加時に `firestore.indexes.json` を更新する。

## 8. 既存処理への影響

- `HandLog` 型・既存サービスは変更しない。
- `ScoringModal` の確定処理では、作成済み `HandLog` のIDを受け取って「成功時にトースト + 当該イベントへ紐付くモーダル起動候補を提示する」フックを追加する。
- `MatchPage`, `CompetitionTablePage`, `SessionDetailPage`, `CompetitionReportPage` では、局履歴またはイベント一覧から `HandLog` 単位で詳細入力に遷移する共通導線を差し込む。

## 9. 非機能要件

- モバイルファースト。`mobile-portrait` 1画面で完結する操作性。
- スタイルは CSS Modules + [src/visuals/tokens.css](../src/visuals/tokens.css) のトークンを使用。色・余白・フォントのハードコードは禁止。
- 日本語UIコピー。
- 1 エントリのドキュメントサイズは数KB想定。Firestore の 1MB 上限に十分収まる。
- オフライン入力の対応は Phase 1 では行わない（オンライン前提）。

## 10. テスト方針

[docs/coding_guidelines.md](./coding_guidelines.md) と Vitest 既存設定に従う。

| テスト対象 | ファイル                                    | 観点                                                         |
| ---------- | ------------------------------------------- | ------------------------------------------------------------ |
| サービス   | `analysisService.test.ts`                   | CRUD / サブスクリプション / Firestore モック                 |
| ヘルパ     | `utils/tiles.test.ts`, `utils/yaku.test.ts` | TileCode 変換、役整合性                                      |
| モーダル   | `AnalysisDetailModal.test.tsx`              | 牌選択 / メルド追加 / 役選択 / バリデーション / 保存呼び出し |
| フック     | `useAnalysisEntry.test.ts`                  | ドラフト編集と props 派生（set-state-in-effect 回避）        |
| ページ     | `AnalysisListPage.test.tsx`                 | 一覧表示 / フィルタ                                          |

カバレッジ 80% 以上を維持。

## 11. 段階リリース（参考、本仕様書外）

| Phase | 内容                                                                            |
| ----- | ------------------------------------------------------------------------------- |
| 1     | データモデル + 入力モーダル + 各画面からの編集導線 + 一覧ページ簡易版 ←本仕様書 |
| 2     | 一覧ページのフィルタ拡充、CSV エクスポート、役/待ち形の出現頻度集計             |
| 3     | 放銃傾向グラフ、月次/年次レポート、共有モード                                   |

## 12. オープン事項

- 役 enum の最終リスト（ローカルルール役の扱い: 流し満貫など）。
- HandLog から `AnalysisEntry` への自動下書き精度（既存 `ScorePayment.name` を解析するか、ScoringModal 入力値を直接渡すか）。

---

関連ドキュメント:

- [docs/specification.md](./specification.md) — 製品全体仕様
- [docs/internal_design.md](./internal_design.md) — 内部設計
- [docs/coding_guidelines.md](./coding_guidelines.md) — コーディング規約
- [docs/game_rules.md](./game_rules.md) — 採用ルール詳細

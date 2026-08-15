# 内部設計書 (Internal Design)

## 1. データモデル設計

本アプリケーションの主要なデータ構造（Firestoreおよびアプリケーション内部で使用）について記述する。

### 1.1 RoomState (ルーム状態)

卓ごとのゲーム進行状態を管理する最上位のオブジェクト。Firestoreの `rooms` コレクションに保存される。

```typescript
interface RoomState {
  id: string; // ルームID
  hostId: string; // ホストプレイヤーID
  status: 'waiting' | 'playing' | 'finished' | 'ended'; // 進行状態
  round: {
    // 現在の場の状態
    wind: 'East' | 'South' | 'West' | 'North'; // 場風
    number: number; // 局数 (1=東1局)
    honba: number; // 本場
    riichiSticks: number; // 供託リーチ棒の本数
    count?: number; // 延長回数など (任意)
  };
  players: Player[]; // 参加プレイヤー情報（点数含む）
  playerIds: string[]; // 検索・権限用IDリスト
  settings: GameSettings; // ゲームルール設定
  history?: RoomState[]; // （非推奨）過去のルーム状態履歴
  gameResults?: GameResult[]; // 完了したゲーム（半荘/東風）の結果リスト
  currentLogs?: HandLog[]; // 現在進行中のゲームの局ごとのログ
  lastEvent?: LastEvent; // 直近のイベント（スコア変動アニメーション用など）
}
```

`settings` および `gameResults[].ruleSnapshot` は Firestore の読み書き境界で normalize し、後方互換のため `noFuFixedPoints` や焼き鳥設定（`yakitoriEnabled`, `yakitoriPoint`）が欠けている既存データには既定値を補完する。

### 1.2 HandLog (局ごとのログ)

1局ごとの結果詳細を記録する。ダッシュボード等での統計分析に使用される。

**[変更点]**: リーチ関連の統計（リーチ率、リーチ後放銃率など）を算出可能にするため、`riichiPlayerIds` を追加する。

```typescript
interface HandLog {
  id: string; // ログID
  timestamp: number; // 記録時刻

  // 局開始時の状態
  round: {
    wind: 'East' | 'South' | 'West' | 'North';
    number: number;
    honba: number;
    riichiSticks: number;
  };

  // その局でリーチしていたプレイヤーのIDリスト (New)
  // これにより、リーチ率やリーチ後の和了/放銃を追跡可能にする。
  riichiPlayerIds: string[];

  // 局の結果
  result: {
    type: 'Win' | 'Draw'; // 和了または流局
    winners?: {
      // 和了者情報 (複数可)
      id: string;
      payment: ScorePayment; // 点数内訳 (役、符、翻など)
    }[];
    loserId?: string | null; // 放銃者ID (ツモの場合はnull/undefined)
    tenpaiPlayerIds?: string[]; // 流局時の聴牌者IDリスト
    scoreDeltas: { [playerId: string]: number }; // この局での最終的な点数増減 (供託・チップ含む)
  };
}
```

### 1.3 GameResult (ゲーム結果)

半荘または東風戦の1単位の結果。

```typescript
interface GameResult {
  id: string;
  timestamp: number;
  ruleSnapshot: GameSettings; // このゲームで使用されたルール
  scores: PlayerGameResult[]; // 最終スコアと順位
  logs?: HandLog[]; // このゲームに含まれる全局のログ
}
```

```typescript
interface GameSettings {
  // 既存項目は省略
  useFuCalculation: boolean;
  noFuFixedPoints?: {
    1: { child: number; dealer: number };
    2: { child: number; dealer: number };
    3: { child: number; dealer: number };
  };
  yakitoriEnabled?: boolean;
  yakitoriPoint?: number;
}
```

- `noFuFixedPoints` は符計算なし時の 1〜3翻固定点テーブルを表す。
- 未設定時は 1翻: 子1000/親1500, 2翻: 子2000/親3000, 3翻: 子4000/親6000 を既定値として扱う。
- 焼き鳥設定の未設定時は `yakitoriEnabled = false`, `yakitoriPoint = 10` を既定値として扱う。

### 1.4 大会シリーズ

複数の独立した `Competition` を統合するため、次の3階層を使用する。

```text
competitionSeries/{seriesId}
├── members/{seriesMemberId}
└── rounds/{roundNumber}
```

- `CompetitionSeries`: シリーズ名、説明、開催期間、主催者、共同主催者を保持する。
- `CompetitionSeriesMember`: シリーズ内で不変の参加者ID、表示名、任意のFirebase Auth UID、有効状態を保持する。
- `CompetitionSeriesRound`: 1始まりの回番号と既存の `competitionId` を保持する。回番号ドキュメントは作成後に上書きしない。
- `Competition.seriesId` / `seriesRoundNumber`: 開催回から親シリーズを逆引きする任意フィールドである。既存大会は両フィールドを持たなくても動作する。
- `CompetitionParticipant.seriesMemberId`: 開催回ごとに異なる参加者IDを、シリーズ内の安定IDへ対応付ける任意フィールドである。

大会と開催回の紐付けはトランザクションで双方を同時更新する。Firestore Rules は `getAfter()` で対応関係を検証し、同一回番号の上書きを拒否する。`seriesMemberId` の保存時は、当該大会の親シリーズに同じメンバーが存在することを `existsAfter()` で検証し、メンバー作成と参加者名寄せを同一バッチで実行できる。

参加URLは `/competition-series/{seriesId}/join` とし、匿名認証を含む認証済みユーザーが自分のAuth UIDと同じドキュメントIDへだけメンバーを作成できる。本人による更新・削除や別UIDへの代理登録は許可せず、以後の編集はシリーズ管理者に限定する。

既存大会参加者の一括アサインは `buildCompetitionParticipantImportPlan` で書き込み前に決定する。

1. `seriesMemberId` が設定済みの参加者はスキップする。
2. 未使用のシリーズ参加者からAuth UIDが一意に一致する人を選ぶ。
3. UIDで一致しない場合、前後空白と大文字・小文字を正規化した名前が一意に一致する人を選ぶ。
4. 一致しない、または候補が複数ある場合は新しいシリーズ参加者を作る。
5. 同一開催回で使用済みのシリーズ参加者を候補から除き、同名参加者の誤統合を防ぐ。

計画したメンバー作成と全参加者の `seriesMemberId` 更新は1つのFirestoreバッチで確定する。

## 2. 統計指標の算出ロジック

ダッシュボードで表示する各指標は、`GameResult` および `HandLog` から以下のように算出する。

### 基本指標

- **平均順位**: `Sum(rank) / TotalGames`
- **和了率**: `Count(WinかつwinnerId==自分) / TotalHands`
- **放銃率**: `Count(WinかつloserId==自分) / TotalHands`

### リーチ関連指標 (新規対応)

`HandLog.riichiPlayerIds` を使用して算出する。

- **リーチ率**:
  `Count(自分 ∈ riichiPlayerIds) / TotalHands`
- **リーチ後和了率**:
  `Count(自分 ∈ riichiPlayerIds AND WinかつwinnerId==自分) / Count(自分 ∈ riichiPlayerIds)`
- **リーチ後放銃率**:
  `Count(自分 ∈ riichiPlayerIds AND WinかつloserId==自分) / Count(自分 ∈ riichiPlayerIds)`

### 大会シリーズ集計

`aggregateCompetitionSeriesStandings` は、各開催回の `CompetitionParticipant.seriesMemberId` をキーに `CompetitionGameResult` を統合する。

- 合計ポイント: 全開催回の `PlayerGameResult.point` の合計
- 平均順位: 全対局の順位合計 / 対局数
- チップ: 全開催回の `chipDiff` の合計
- 参加回数: 成績が存在する開催回数
- 総合順位: 合計ポイント降順、平均順位昇順、シリーズ参加日時昇順、シリーズ参加者ID昇順
- 未名寄せ: `seriesMemberId` がない、または現存メンバーを参照しない成績参加者を別一覧にする。総合順位には含めない。

`CompetitionSeriesReportPage` は同じ集計結果から総合成績と開催回別内訳を描画する。`useCompetitionSeries` はシリーズ本体・メンバー・開催回定義の読込状態とは別に、各開催回の大会・参加者・対局結果の購読がすべて応答したかを `roundDetailsLoading` で公開する。レポートはこの状態が完了するまで描画・印刷を開始しない。

PDF出力は既存の `generatePdfReport`（`window.print()`）を再利用する。未名寄せ参加者、取得不能な開催回、対局結果0件のいずれかがある場合は印刷ボタンを無効にし、クライアント上の不完全なスナップショットを公式レポートとして出力しない。集計値とPDFはFirestoreへ保存しない。

初回自動アサインは、現在の開催回を除外した過去開催回の集計を `seriesMemberId` で当日の参加者へ適用する。当該大会に1件でも対局結果が存在する場合はシリーズ成績を使用せず、従来どおり当該大会内の累計成績を使う。

## 3. 点数計算ロジック

(既存の `scoreCalculator.ts` 参照)

- 4麻/3麻対応
- 符計算あり/なしモード対応
- 符計算なし時の 1〜3翻固定点テーブルのカスタマイズ対応

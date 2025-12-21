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

## 3. 点数計算ロジック

(既存の `scoreCalculator.ts` 参照)

- 4麻/3麻対応
- 符計算あり/なしモード対応

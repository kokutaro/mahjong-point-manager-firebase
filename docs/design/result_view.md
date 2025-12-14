# 戦績・セット管理画面 (Result View) 詳細設計

## 1. 概要
半荘(または東風戦)終了時に表示される、ゲーム結果の確認およびセット全体の戦績管理を行う画面。
ユーザ指定の計算ロジックに基づき、ウマ・オカ・細かな端数処理を行った最終ポイントを算出・表示する。

## 2. データ構造

### 2.1 GameResult (新規追加)
1ゲームの結果を保持する。
```typescript
interface GameResult {
  id: string;          // ゲームID
  timestamp: number;   // 終了時刻
  ruleSnapshot: GameSettings; // 当該ゲームのルール設定(ウマ・オカ等)
  scores: PlayerGameResult[]; // プレイヤーごとの結果
}

interface PlayerGameResult {
  playerId: string;
  name: string;
  rank: number;        // 順位 (1-4)
  rawScore: number;    // 素点 (例: 25000)
  point: number;       // 最終ポイント (例: +55.0)
  chipDiff: number;    // チップ増減数 (オプション)
}
```

### 2.2 RoomState 拡張
```typescript
interface RoomState {
  // ...既存
  gameResults: GameResult[]; // セット内の履歴
}
```

### 2.3 GameSettings 拡張
```typescript
interface GameSettings {
  // ...既存
  useOka: boolean; // オカの有無 (UI制御用) -> これにより returnPoint が制御される想定
  // 既存の uma: [number, number] を活用
}
```

## 3. 計算ロジック詳細

### 3.1 順位決め (Ranking)
1. **比較**: `Player.score` の高い順。
2. **同点処理 (Tie-breaker)**:
   - **上家優先 (Head-bump / Priority to Upstream)**。
   - ゲーム開始時の「起家 (East)」に近いプレイヤーを上位とする。
   - `RoomState.players` の並び順が通常「起家(E)・南(S)・西(W)・北(N)」となっている場合、配列のインデックスが小さい方を上位とする。
     - *注意*: プレイヤーの `wind` はラウンドごとに変わるが、`players` 配列の並び順が「座順」を維持しているか、あるいは `wind` プロパティで判定するか。
     - 実装では `wind` プロパティ ('East' > 'South' > 'West' > 'North') で判定する。

### 3.2 ポイント計算 (Score Calculation)
以下の手順で算出する。

#### 定数定義
- `P`: プレイヤーの素点 (Raw Score)
- `R`: 返し点 (Return Point / Gen-ten) = `settings.returnPoint` (通常30,000)
- `UMA`: ウマ設定 (順位に応じた加算値)

#### 計算手順
1. **2位〜4位 (3人麻雀なら2位〜3位)**:
   - `Base = P / 1000`
   - `Target = R / 1000`
   - **端数処理**:
     - `P < R` (原点未満) の場合: `Rounded = Math.ceil(Base)` (切り上げ)
     - `P >= R` (原点以上) の場合: `Rounded = Math.floor(Base)` (切り捨て)
   - `FinalScore = Rounded - Target`

2. **1位 (Top)**:
   - **トップ取り**: 他のプレイヤーの `FinalScore` の合計を求め、その符号を反転させた値を 1位の `FinalScore` とする。
   - `FinalScore(1st) = -1 * sum(FinalScore(others))`
   - *備考*: これにより全体の合計が必ず 0 になる。

3. **ウマの加算**:
   - 各プレイヤーの `FinalScore` に、順位に応じたウマを加算する。
   - `TotalPoint = FinalScore + UMA[rank]`

### 3.3 オカ (Oka) について
- **オカあり**: `startPoint` 25,000, `returnPoint` 30,000 の場合、差額 20,000点分 (5,000 x 4) がトップの総取りとなる。上記の「トップ取り」計算ロジックにより自動的にトップに加算される。
- **オカなし**: `startPoint` 25,000, `returnPoint` 25,000 に設定することで、差額が発生せずオカなしとなる。

## 4. 画面遷移フロー
1. **対局終了**: `ScoringModal` 等で終了条件を満たす、またはメニューから「終了」を選択。
2. **結果表示**: `ResultView` コンポーネントを表示。
   - 今回の結果詳細 (順位、素点、ポイント)
   - セットトータルの表
3. **アクション**:
   - **「次の対局へ (Next Game)」**:
     - 現在の座順をベースに、起家を回す (起家ローテーション)。
     - 点数をリセット (StartPointへ)。
     - 供託・積み棒リセット。
     - チップは維持(累積)。
     - `gameResults` に結果を保存。
   - **「セット終了」**:
     - 最終結果確認画面へ (必要であれば)。

## 5. 考慮事項
- **3人麻雀の場合**:
  - 計算ロジックは4人と同様。2位〜3位を計算し、1位がバランスを取る。
  - ウマの適用順位に注意 (2位が0、3位がマイナスなど)。

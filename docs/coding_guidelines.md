# コーディング・コンポーネント規約

## 1. 全体方針
- **言語**: TypeScript (Strict Mode)
- **フォーマッター**: Prettier
- **リンター**: ESLint
- **原則**: "Readability counts." (可読性重視), "Don't Repeat Yourself" (DRY)

## 2. 命名規則 (Naming Conventions)

### 2.1 全般
- **変数・関数**: `camelCase` (例: `currentUser`, `calculateScore`)
- **定数**: `UPPER_SNAKE_CASE` (例: `MAX_PLAYERS`, `DEFAULT_SCORE`)
- **型・インターフェース**: `PascalCase` (例: `Player`, `ScoreContext`)
    - 接頭辞 `I` や `T` は付けない (例: `IPlayer` は不可)
- **ファイル名**:
    - Reactコンポーネント・Hook: `PascalCase.tsx` (例: `ScoreBoard.tsx`)
    - ユーティリティ・関数系: `camelCase.ts` (例: `scoreUtils.ts`)

### 2.2 Reactコンポーネント
- **コンポーネント名**: 機能を表す名詞にする。`PascalCase`。
- **Props**: インターフェース名は `コンポーネント名 + Props` とする。
    ```typescript
    interface ScoreBoardProps {
      players: Player[];
    }
    export const ScoreBoard = ({ players }: ScoreBoardProps) => { ... };
    ```

## 3. ディレクトリ構成 (Directory Structure)

```
src/
  ├── components/       # UIコンポーネント
  │   ├── ui/           # 汎用デザインパーツ (Button, Card等) - ロジックを持たない
  │   ├── features/     # 機能単位のコンポーネント群 (ScoringModal, PlayerList等)
  │   └── layouts/      # ページレイアウト (Header, MainLayout)
  ├── hooks/            # カスタムフック (useGameLogic, useFirestore等)
  ├── pages/            # ページコンポーネント (ルーティング単位)
  ├── services/         # 外部連携 (Firebase API等)
  ├── types/            # 型定義
  ├── utils/            # 純粋関数・ヘルパー
  └── visuals/          # グローバルスタイル, 定数(Colors)
```

## 4. コンポーネント設計規約

### 4.1 コンポーネントの分類
1. **UI Components (`components/ui/`)**:
    - **役割**: 見た目のみを担当する原子的なコンポーネント。
    - **ルール**: 
        - 外部のドメインロジック（麻雀のルール等）に依存しない。
        - 状態(State)を極力持たない。Propsで受け取ったデータを表示するのみ。
2. **Feature Components (`components/features/`)**:
    - **役割**: 特定の機能を実現するコンポーネント。
    - **ルール**: 
        - UIコンポーネントを組み合わせて画面の一部を構成する。
        - 必要なデータ取得やイベントハンドリングを行う。
3. **Pages (`pages/`)**:
    - **役割**: 1つの画面全体を統括する。
    - **ルール**: ルーティングのエントリーポイントとなる。

### 4.2 ロジックの分離 (Custom Hooks)
- UIとロジックを分離するため、複雑な処理は**Custom Hook**に切り出す。
    - 例: `ScoreBoard`コンポーネントの中で点数計算ロジックを直書きせず、`useScoreCalculation` フック等を呼び出す。

## 5. CSS/スタイリング規約
- **手法**: **CSS Modules** または **Vanilla CSS + CSS Variables** (本プロジェクト方針に従う)
- **クラス命名**: BEM記法に準拠するか、CSS Modulesの場合はシンプルなキャメルケースを推奨。
- **Design Tokens**: 色、スペース、フォントサイズは `src/visuals/tokens.css` 等で定義したCSS変数を必ず使用し、マジックナンバーを避ける。

## 6. その他
- **コメント**: 
    - 「何をしているか」ではなく「なぜそうするか」を書く。
    - 複雑な計算ロジック（麻雀の点数計算など）には必ずJSDoc形式で説明と例を記述する。
- **Gitコミット**: Conventional Commits (例: `feat: add undo feature`, `fix: score calculation bug`) を推奨。

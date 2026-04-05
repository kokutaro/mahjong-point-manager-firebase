---
name: frontend-feature-workflow
description: 'MahjongPointManager 向けフロントエンド実装ワークフロー。Use when: React 19 + TypeScript + Vite + React Router + Firebase の機能追加、バグ修正、UI改善を Issue 作成から PR 作成まで一貫して進めたいとき。issue作成 調査 計画 TDD 実装 lint build test 手動確認 コードレビュー PR作成 振り返り。'
argument-hint: '実装したい機能・修正したいバグ・変更内容の概要を入力してください'
agent: 'agent'
---

# Frontend Feature Development Workflow

ユーザーの指示を入力として、Issue 作成から PR 作成まで一気通貫で進める MahjongPointManager 専用のフロントエンド実装ワークフロー。

このプロンプトは以下を前提にする。

- [.github/copilot-instructions.md](../copilot-instructions.md)
- [.github/instructions/frontend.instructions.md](../instructions/frontend.instructions.md)
- [docs/specification.md](../../docs/specification.md)
- [docs/game_rules.md](../../docs/game_rules.md)
- [docs/internal_design.md](../../docs/internal_design.md)

## When to Use

- React / TypeScript の新機能、バグ修正、UI コンポーネント実装を最初から最後まで完結させたいとき
- Firebase Auth / Firestore と連動する画面、部品、状態更新を安全に変更したいとき
- 麻雀の点数計算、流局、精算、履歴表示など、[docs/game_rules.md](../../docs/game_rules.md) と整合させる必要がある変更を扱うとき
- Issue を起点に調査、計画、実装、レビュー、PR 作成までの標準フローを実行するとき

## Tech Stack

| 項目           | 技術                                                                 |
| -------------- | -------------------------------------------------------------------- |
| ビルド         | Vite + TypeScript (`npm run build`)                                  |
| ルーティング   | React Router v7 + lazy loaded pages                                  |
| データ同期     | Firebase Auth + Firestore + custom hooks                             |
| スタイル       | CSS Modules + [src/visuals/tokens.css](../../src/visuals/tokens.css) |
| ユニットテスト | Vitest (主に `src/utils` と `src/services`)                          |
| ブラウザ確認   | 専用 E2E 基盤は未導入。必要に応じて `npm run dev` で手動確認         |
| Lint / Format  | ESLint + Prettier                                                    |

## Prerequisites

以下のエージェントが `.github/agents/` に存在すること:

- `issue.agent.md`
- `deep-research.agent.md`
- `plan.agent.md`
- `impl.agent.md`
- `review.agent.md`
- `triage.agent.md`
- `doc-writer.agent.md`
- `pr.agent.md`
- `pr-semver-labeler.agent.md`

代表的な参照起点:

- [src/components/ui/Button.tsx](../../src/components/ui/Button.tsx)
- [src/hooks/useRoom.ts](../../src/hooks/useRoom.ts)
- [src/services/roomService.ts](../../src/services/roomService.ts)

作業ディレクトリ: `MahjongPointManager/`

## Workflow Overview

```
ユーザー指示
    ↓
[Step 1] issue-agent → Issue 作成 (Issue番号を取得)
    ↓
[Step 2] deep-research-agent → リポジトリ調査 + 改修候補/参照先の整理
    ↓
[Step 3] plan-agent → 実装計画 + 検証観点の整理
    ↓
[Step 4] impl-agent → TDD 実装 + ユニットテスト
    ↓
[Step 5] 検証 → lint / build / test + 影響画面の手動確認
    ↓
[Step 6] review-agent → コードレビュー
    ↓
[Step 7] triage-agent → PRブロッカー抽出
    ↓
 PRブロッカーあり? ──Yes──→ [Step 8] 修正 → Step 4 に戻る
    ↓No
[Step 9] doc-writer-agent → 振り返りドキュメント作成
    ↓
[Step 10] pr-agent → PR 作成
    ↓
[Step 11] pr-semver-labeler-agent → semver ラベル付与 + 付与確認
```

---

## Step-by-Step Procedure

### Step 1: Issue 作成 (`issue-agent`)

`@issue` エージェントを呼び出し、ユーザーの指示をもとにIssueを作成する。

**実行内容:**

- ユーザー指示の要件を精査し、GitHub Issueを作成する
- **Issue番号を必ず受け取り、以降のステップで使用する**
- UI 改修なら対象画面、対象ルート、期待する操作フローを Issue に含める
- ルール・点数・履歴関連なら対象ドキュメントを Issue に明記する

**注意:**

- Issue作成は必須。スキップしない
- Issue番号が確定するまでStep 2には進まない

---

### Step 2: リポジトリ調査 (`deep-research-agent`)

`@deep-research` エージェントを呼び出し、Issue の要件を入力としてフロントエンド実装の観点でリポジトリ調査を行う。

**実行内容:**

- どのルート、画面、コンポーネント、hooks、services、types、utils、テストを改修すべきかを洗い出す
- [src/pages](../../src/pages)、[src/components/features](../../src/components/features)、[src/components/ui](../../src/components/ui)、[src/hooks](../../src/hooks)、[src/services](../../src/services)、[src/types/index.ts](../../src/types/index.ts) を横断して参照候補を整理する
- 既存 UI パターン、近い機能、関連ドキュメント、影響範囲を整理する
- Firebase-backed な変更では [firestore.rules](../../firestore.rules)、[firestore.indexes.json](../../firestore.indexes.json)、[firebase.json](../../firebase.json) への波及を確認する
- 点数・ルール・結果表示に関わる変更では、ロジックを UI に直書きせず [src/utils](../../src/utils) の既存ヘルパー再利用を前提に調査する

**引き渡し情報 (次Stepへ):**

- 改修候補箇所の一覧
- 参照すべき既存実装とドキュメント
- 影響範囲とテスト観点

**注意:**

- 調査を省略して実装に入らない
- Step 3 のテスト設計と実装方針は、この調査結果を前提に組み立てる

---

### Step 3: 実装計画 (`plan-agent`)

`@plan` エージェントを呼び出し、Issue と調査結果をもとに実装計画を作成する。

**実行内容:**

- 変更対象を画面、hook、service、utility、型、ドキュメント単位に分解する
- TDD の順序で「先に書くテスト」「後から実装するコード」を明確にする
- 検証方法を `lint` / `build` / `test` / 手動確認 の4系統で整理する
- 変更が大きい場合は、ブランチ作成や作業分割も計画に含める

**引き渡し情報 (次Stepへ):**

- 実装ステップ一覧
- 先に失敗させるテストの候補
- 検証コマンドと手動確認項目

---

### Step 4: TDD 実装 (`impl-agent` / `tdd-workflow` skill)

`@impl` エージェントを利用してTDDでユニットテストと実装を行う。

**実行内容:**

1. 失敗するテストを先に書く (RED) — `vitest` ベース
2. テストを通す最小実装を書く (GREEN)
3. コードを整理する (REFACTOR)
4. UI の複雑な状態処理は TSX へ直書きせず、必要に応じて hook や utility に抽出する
5. 以下のコマンドで全チェックをパスすることを確認:

```bash
cd MahjongPointManager
npm run lint
npm run build
npm run test
```

**テスト配置規則:**

- 既存パターンを優先し、`src/utils/*.test.ts`、`src/utils/__tests__/*.test.ts`、`src/services/*.test.ts` に合わせる
- UI 変更でも、まず検証しやすいロジックを `src/hooks` や `src/utils` に抽出してテストする
- 現状は Testing Library / Playwright / MSW 前提で進めない。必要なら依存追加の妥当性を先に確認する

**引き渡し情報 (次Stepへ):**

- 変更されたファイル一覧
- 追加・修正されたテストの概要

---

### Step 5: 検証 (`lint` / `build` / `test` / 手動確認)

今回の変更に対する自動検証とブラウザ確認を実施する。

**実行内容:**

```bash
cd MahjongPointManager
npm run lint
npm run build
npm run test
```

必要に応じて以下も実施する。

- `npm run dev` でローカル起動し、影響する画面をブラウザで確認する
- 対象ルートは `/`、`/room/:roomId`、`/history`、`/history/:roomId`、`/dashboard` から該当箇所を選ぶ
- 認証初期化、Suspense fallback、Snackbar 表示、モバイル表示崩れ、長いプレイヤー名や点数表示崩れを確認する

**注意:**

- このリポジトリには専用 E2E コマンドがないため、存在しない `npm run e2e` を前提にしない
- ブラウザ確認を実施できない場合は、結果を捏造せず「未確認」と記録する

---

### Step 6: コードレビュー (`review-agent`)

`@review` エージェントを呼び出し、実装内容をレビューする。必要に応じて Step 2 の調査結果も渡し、既存 UI パターンとの整合性を確認する。

**実行内容:**

- Step 2-5 で変更されたコード・テスト・検証結果を対象にレビューを実施
- Findingsを重大度付きで出力する

**フロントエンド固有のレビュー観点:**

- `React.memo` / `useMemo` / `useCallback` の不適切な使用
- コンポーネントの責務分離（UIとロジックの混在）
- CSS Modules と design tokens の再利用漏れ
- React Router のルート影響と lazy loading / fallback の整合性
- Firestore のネスト更新や `Partial<RoomState>` 更新によるデータ破壊リスク
- 日本語コピー、麻雀用語、モバイル操作性の維持
- アクセシビリティ (aria属性、キーボード操作)

**引き渡し情報 (次Stepへ):**

- レビューのFindings全文 (重大度・カテゴリ・内容)

---

### Step 7: トリアージ (`triage-agent`)

`@triage` エージェントに Issue番号とレビューのFindingsを渡してトリアージする。

**呼び出し方の例:**

```
@triage Issue #42 の実装に対するレビュー結果です。
[Findingsをここに貼り付け]
```

**実行内容:**

- PRブロッカー（必須対応）と非ブロッカー（任意対応）を分類して返す

**フロントエンド固有のブロッカー基準:**
| カテゴリ | 具体例 |
|----------|--------|
| 型安全性の破綻 | `any` の多用、危険な型アサーション、`RoomState` / `GameResult` 契約破壊 |
| ランタイムエラー | 画面遷移時のクラッシュ、未ハンドル Promise、null 耐性不足 |
| データ整合性 | Firestore 更新でネスト項目を壊す、履歴やスコア計算を破壊する変更 |
| セキュリティ | 認証逸脱、機密情報のハードコード、危険な HTML 挿入 |
| テスト欠落 | 変更に直接対応する Vitest が存在しない |
| ビルド失敗 | `npm run build` または `npm run test` が通らない |

**分岐:**

- **PRブロッカーあり** → Step 8 へ進む
- **PRブロッカーなし** → Step 9 へ進む

---

### Step 8: ブロッカー修正 (条件付き)

トリアージで抽出されたPRブロッカーを修正する。

**実行内容:**

1. 各PRブロッカーに対して修正を実装する
2. 以下のコマンドで全チェックを再確認:

```bash
cd MahjongPointManager
npm run lint
npm run build
npm run test
```

3. UI変更なら影響画面を再度手動確認する

**完了後:**

- **Step 4 に戻り**、修正内容を対象に Step 4 → Step 7 を繰り返す
- 「PRブロッカーなし」になるまでループする (最大3回)

---

### Step 9: 振り返りドキュメント作成 (`doc-writer-agent`)

`@doc-writer` エージェントを呼び出し、振り返りドキュメントを作成する。

**実行内容:**

- Issue番号・実装内容・レビュー結果・学びをもとに `docs/issue-{番号}-reflection.md` を作成する
- [docs/reflection-document-spec-v1.md](../../docs/reflection-document-spec-v1.md) に従い、検証結果には `lint` / `build` / `test` / 手動確認 を記載する
- E2E 未導入の場合は `e2e: 未確認` と明記する

---

### Step 10: PR 作成 (`pr-agent`)

`@pr` エージェントを呼び出し、PRを作成する。

**実行内容:**

- Issue番号と実装内容に基づき、以下を含むPRを作成する
- `closes #<Issue番号>` でIssueにリンクする
- 変更内容を画面、コンポーネント、hook、service、utility、ドキュメント単位で説明する
- テスト計画に `npm run lint`、`npm run build`、`npm run test`、必要なら手動確認項目を含める
- `gh` の本文生成時は [.github/agents/gh-body-rules.md](../agents/gh-body-rules.md) に従う

---

### Step 11: semver ラベル付与と確認 (`pr-semver-labeler-agent`)

`@pr-semver-labeler` エージェントを呼び出し、PRの変更内容から `release:patch` / `release:minor` / `release:major` を判定させる。

**実行内容:**

- PR番号を引数として渡し、ラベルを Exactly 1つ付与する
- `release:patch` / `release:minor` / `release:major` の3種のうち、選択された1つだけが付与されていることを確認する
- 他のラベル（例: `bug`, `enhancement`）は保持されていることを確認する

**呼び出し方の例:**

```
@pr-semver-labeler 123
```

**確認コマンド例:**

```bash
gh pr view 123 --json labels --jq '.labels[].name'
```

---

## Quality Gates

各ステップを次に進む前に確認すること:

| Gate                 | 確認内容                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Step 1 完了          | Issue番号が確定している                                                                  |
| Step 2 完了          | 改修候補、参照先、影響範囲、テスト観点が整理されている                                   |
| Step 3 完了          | 実装計画と検証方針が整理されている                                                       |
| Step 4 完了          | `npm run lint` + `npm run build` + `npm run test` が全パス                               |
| Step 5 完了          | 影響画面の手動確認を実施した、または未確認を明示した                                     |
| Step 7 完了          | PRブロッカーの有無が確定している                                                         |
| Step 8 完了 (該当時) | 修正後も全チェックがパスし、必要な手動確認が終わっている                                 |
| Step 9 完了          | 振り返りドキュメントが `docs/` に保存されている                                          |
| Step 10 完了         | PRがリモートに作成されている                                                             |
| Step 11 完了         | `release:patch` / `release:minor` / `release:major` のラベルが Exactly 1つ付与されている |

## Tips

- Step 2 の deep-research 結果を使って、既存コンポーネントや hooks の再利用可能性を判断してから実装に入る
- 点数、流局、精算、順位計算に関わる変更は [docs/game_rules.md](../../docs/game_rules.md) と `src/utils/*.test.ts` を必ず突き合わせる
- Firebase-backed な変更は [src/services/roomService.ts](../../src/services/roomService.ts) の更新パターンを崩さず、必要なら [firestore.rules](../../firestore.rules) と [firestore.indexes.json](../../firestore.indexes.json) も見直す
- UIスタイルは CSS Modules と [src/visuals/tokens.css](../../src/visuals/tokens.css) を優先し、ハードコードを避ける
- このリポジトリでは E2E 基盤が未整備である。新たに導入していない限り、存在しないフローをプロンプトに混ぜない
- Step 6 のループは **最大3回** を目安にする。3回ループしても同一ブロッカーが残る場合はユーザーに判断を仰ぐ
- PR作成前に `git diff main...HEAD -- .` で変更全体を確認し、意図しないファイルが含まれていないかチェックする
- PR作成後は `@pr-semver-labeler <PR番号>` を必ず実行し、release自動化用ラベルを確定させる

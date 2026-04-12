---
name: frontend-patch-workflow
description: 'MahjongPointManager 向け軽微なフロントエンド修正ワークフロー。Use when: UIの見た目調整、文言修正、余白や配色の微調整、小さな挙動修正など patch レベルの改修を Issue 作成からブランチ作成、実装、lint/build/test、PR 作成まで一気通貫で進めたいとき。small fix patch UI調整 スタイル修正 文言修正 issue branch implement test pr。'
argument-hint: '行いたい軽微な修正内容を入力してください'
agent: 'agent'
---

# Frontend Patch Workflow

ユーザーの指示を入力として、MahjongPointManager の軽微なフロントエンド修正を Issue 作成から PR 作成までコンパクトに進めるためのワークフロー。

このプロンプトは以下を前提にする。

- [.github/copilot-instructions.md](../copilot-instructions.md)
- [.github/instructions/frontend.instructions.md](../instructions/frontend.instructions.md)
- [.github/agents/gh-body-rules.md](../agents/gh-body-rules.md)
- [src/visuals/tokens.css](../../src/visuals/tokens.css)

大きな改修には使わない。スコープが膨らむ場合は [frontend-feature.prompt.md](./frontend-feature.prompt.md) に切り替える。

## When to Use

- CSS Modules の見た目調整、余白、配色、タイポグラフィ、レスポンシブ崩れ修正
- ボタン文言、ラベル、説明文などの軽微なコピー修正
- 既存コンポーネント内で完結する小さな UI 挙動修正
- 既存 hook / utility / page に対する局所的なバグ修正

## Do Not Use

- 新規画面や新規ルートの追加
- Firestore のスキーマ、rules、indexes 変更を伴う改修
- 複数画面から使われる shared hook / service / utility の変更で、影響範囲を即座に閉じ込められない改修
- 点数計算、ルール判定、履歴整合性など複数レイヤーにまたがる改修
- 依存追加、大規模リファクタリング、広範囲の設計変更

これらに該当する場合は、このプロンプトを継続せず [frontend-feature.prompt.md](./frontend-feature.prompt.md) を使うよう案内する。

## Scope Gate

最初に、依頼が patch レベルかどうかを判定する。

- 変更対象は通常 1 から 5 ファイル程度に収まるか
- 既存パターンの再利用で完結できるか
- shared hook / service / utility を触る場合でも、影響が局所的で既存テストまたは追加テストで閉じられるか
- 新しい設計判断や大きなデータ変更が不要か

1つでも外れる場合は、重いワークフローへ切り替える。

## Workflow Overview

```text
ユーザー指示
    ↓
[Step 1] patch スコープ判定
    ↓
[Step 2] issue-agent → Issue 作成または整備
    ↓
[Step 3] ブランチ作成
    ↓
[Step 4] 必要最小限の調査と実装
    ↓
[Step 5] lint / build / test
    ↓
[Step 6] acceptance-test-agent → 受入テスト（UI 変更時）
    ↓
[Step 7] commit / push
    ↓
[Step 8] pr-agent → PR 作成
    ↓
[Step 9] pr-semver-labeler-agent → release ラベル確定
```

## Step-by-Step Procedure

### Step 1: スコープ判定

依頼内容を読み、軽微修正として完結できるかを先に判断する。

- 適用可能ならこのプロンプトを継続する
- 適用不可なら理由を短く説明し、[frontend-feature.prompt.md](./frontend-feature.prompt.md) の利用を勧める

### Step 2: Issue 作成 (`issue-agent`)

`@issue` エージェントを呼び出し、依頼内容に対応する Issue を作成または補完する。

必須要件:

- Issue番号を必ず取得する
- UI修正なら対象画面、対象要素、期待する見た目や操作を Issue に入れる
- 文言修正なら変更前と変更後の意図を簡潔に残す
- GitHub 本文の扱いは [.github/agents/gh-body-rules.md](../agents/gh-body-rules.md) に従う

### Step 3: ブランチ作成

Issue番号を使って作業ブランチを作成する。

ブランチ命名のデフォルト:

- 通常の軽微修正: `fix/issue-<番号>-<短いスラッグ>`
- 見た目や文言のみ: `chore/issue-<番号>-<短いスラッグ>`

実行方針:

- `main` から分岐する
- 既存の未コミット変更を壊さない
- 作業ツリーが汚れていて衝突しそうなら勝手に消さず、影響を見極めて進める

### Step 4: 必要最小限の調査と実装

重い調査フェーズは入れず、必要な箇所だけを読み、最小差分で実装する。

実装ルール:

- 既存の component / page / hook / utility パターンを優先して再利用する
- UI ロジックを TSX に増やしすぎず、必要なら `src/hooks` や `src/utils` に寄せる
- スタイルは CSS Modules と [src/visuals/tokens.css](../../src/visuals/tokens.css) を優先し、ハードコードを避ける
- 日本語コピーは依頼がない限り意味を変えない
- 依存追加は原則しない。必要になった時点で patch レベルを超えていないか再判定する

代表的な参照起点:

- [src/components/ui/Button.tsx](../../src/components/ui/Button.tsx)
- [src/hooks/useRoom.ts](../../src/hooks/useRoom.ts)
- [src/services/roomService.ts](../../src/services/roomService.ts)

### Step 5: 検証

軽微修正でも検証は省略しない。

最低限の実行項目:

```bash
cd MahjongPointManager
npm run lint
npm run build
npm run test
```

追加ルール:

- 既存の関連テストがある箇所なら、変更に対応するテストを追加または更新する
- 見た目だけの変更でも、既存テストが壊れていないことは確認する
- UI 表示確認は Step 6 の受入テストで実施する
- 失敗した検証結果を捏造せず、そのまま記録する
- `lint` / `build` / `test` が今回の変更起因で失敗している間は Step 6 へ進まない
- 失敗が既存不良で今回の変更と無関係だと判断した場合のみ、根拠を残したうえでユーザーに共有して次に進む

### Step 6: 受入テスト (`acceptance-test-agent`)（UI 変更時）

UI に影響する変更の場合、`@acceptance-test` エージェントを呼び出し、エミュレータ環境で見た目・動作を検査する。

**実行条件:**

- CSS、レイアウト、コンポーネント表示、文言に関わる変更がある場合は実施する
- ロジックのみの変更や設定ファイルのみの変更では省略可能

**実行内容:**

- Firebase エミュレーターと開発サーバーを起動し、統合ブラウザで変更箇所を確認する
- 結果を Pass/Fail 一覧として報告する
- Fail がある場合は Step 4 に戻って修正する

### Step 7: commit / push

PR 作成前に、変更内容が依頼の範囲に収まっていることを確認してコミットする。

実行内容:

- `git status` と差分を確認し、不要な変更が混ざっていないか確認する
- Conventional Commits に沿ったコミットメッセージを使う
- 例: `fix: adjust report page spacing`, `chore: update competition join copy`
- リモートへ push し、PR 作成可能な状態にする

### Step 8: PR 作成 (`pr-agent`)

`@pr` エージェントを呼び出し、PR を作成する。

前提条件:

- Step 5 の必須検証が完了していること
- UI 変更があれば Step 6 の受入テストが完了していること
- push 済みで PR を作成できる状態であること

PR には最低限以下を含める。

- `closes #<Issue番号>`
- 何を小さく直したか
- 影響画面または対象コンポーネント
- 実行した検証 (`npm run lint`, `npm run build`, `npm run test`, 必要なら受入テスト結果)
- 未確認事項や残課題があれば明記

GitHub 本文の扱いは [.github/agents/gh-body-rules.md](../agents/gh-body-rules.md) に従う。

### Step 9: release ラベル付与 (`pr-semver-labeler-agent`)

`@pr-semver-labeler` エージェントを呼び出し、PR に `release:patch` / `release:minor` / `release:major` のいずれか1つを付与する。

実行内容:

- PR番号を渡してラベルを判定させる
- `release:*` ラベルが Exactly 1つ付いていることを確認する
- 付与に失敗した場合は、そのままにせず原因を確認する

この repo では merge 後のリリース処理が release ラベル前提で動くため、省略しない。

## Completion Format

最後は以下を簡潔に報告する。

- Issue番号
- 作業ブランチ名
- 主な変更点
- 追加または更新したテスト
- 実行した検証結果
- PR番号または PR URL
- 付与した release ラベル
- 残っているリスクや未確認事項

## Guardrails

- 調査、計画、レビュー、振り返りドキュメント作成を毎回必須にしない
- ただし実装途中で patch レベルを超えたら、そこで止めて [frontend-feature.prompt.md](./frontend-feature.prompt.md) へ切り替える
- 既存の未コミット変更やユーザー変更は勝手に巻き戻さない
- 検証未完了または release ラベル未付与のまま、完了扱いにしない
- PR を作れない状態なら、何が足りないかを具体的に示して止まる

## Example Invocations

- `/frontend-patch レポート画面の見出しとカード余白をスマホで少し調整したい`
- `/frontend-patch 参加ページの説明文を短くし、送信ボタンの幅を整えたい`
- `/frontend-patch ダッシュボードの空状態メッセージを自然な文言に直したい`

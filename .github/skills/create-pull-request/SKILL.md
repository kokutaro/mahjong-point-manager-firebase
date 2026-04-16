---
name: create-pull-request
description: >
  MahjongPointManager プロジェクト向けの PR 作成ガイド。
  タイトルをリリースノートに使われることを意識した形式に統一し、
  プロジェクト標準の本文テンプレートに沿った PR を作成する。
  Use when: opening a PR, creating a pull request, submitting changes for review.
origin: project-custom
---

# Pull Request 作成スキル

## 目的

PR のタイトルはリリースノート・自動リリースに直接利用される。  
このスキルは、リリース文として自然に読めるタイトルと、  
レビュアーに必要な情報が揃った本文を一貫して生成する。

---

## Step 1: 事前チェック

PR 作成前に以下を確認する:

```bash
git status          # 未コミットの変更がないか
git log --oneline origin/main..HEAD  # プッシュ済みコミットを確認
npm run lint        # lint エラーがないか
npm run build       # ビルドが通るか
npm run test        # テストが全て通るか
```

いずれかが NG の場合は、修正してから PR を作成する。

---

## Step 2: タイトルの決定

### ルール

| 禁止                      | 推奨                                                  |
| ------------------------- | ----------------------------------------------------- |
| `feat: add user settings` | `ユーザー設定の永続化機能を追加`                      |
| `fix: modal drag out`     | `モーダルのドラッグアウトで意図せず閉じる問題を修正`  |
| `docs: update manual`     | `マニュアルと振り返りドキュメントを更新`              |
| `refactor: clean up`      | `スコア計算ロジックを utils に切り出してコードを整理` |

### 原則

1. **conventional commit プレフィックス (`feat:`, `fix:` 等) は使わない**  
   → リリースノートに記載されたとき、そのまま意味が通る文にする
2. **何の機能／画面か + 何をしたか** が一目でわかるようにする  
   例: `「大会一覧ページ」に参加者数の表示を追加`  
   例: `ルーム作成フォームのデフォルト値をユーザー設定から読み込むよう改善`
3. 60 文字以内を目安にする（長い場合は括弧で画面名を補足する）
4. 体言止めより **動詞終わり** を推奨（〜を追加、〜を修正、〜に対応）
5. 日本語を使用

### セマンティクス判定（pr-semver-labeler との整合）

タイトルを見たとき、変更の規模が推測できるようにする:

- **major**: 「〜を廃止」「〜を移行」「API を変更」など破壊的変更を含意する言葉
- **minor**: 「〜を追加」「〜機能を実装」「〜に対応」など機能追加を含意する言葉
- **patch**: 「〜を修正」「〜を改善」「〜を更新」「〜を整理」など改善・修正を含意する言葉

---

## Step 3: 本文テンプレート

```markdown
## 概要

- [変更の背景・目的を 1〜3 行で記述]
- [主要な変更点のサマリー]

## 変更内容

### [カテゴリ1]（例: component / hook / service / utils / test / docs）

- `src/path/to/file.tsx`: 変更点の説明
- `src/path/to/other.ts`: 変更点の説明

### [カテゴリ2]（必要に応じて追加）

- `firestore.rules`: 変更点の説明

## テスト計画

- [x] npm run lint
- [x] npm run build
- [x] npm run test（XX files / YYY tests passed）
- [ ] 受入テスト（手動確認項目を記載）

Closes #[issue番号]
```

### テンプレート記入ガイド

| セクション     | 書き方のポイント                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| **概要**       | 「なぜ変えたか」を中心に。Issue 番号だけでなく背景を 1 文加える                                         |
| **変更内容**   | カテゴリ単位で分類。ファイルパスはバッククォートで囲む                                                  |
| **テスト計画** | `npm run test` はテスト数まで記載する。受入テストはブラウザ制限の場合「ソースレビュー代替・Pass」と記載 |
| **Closes**     | Issue が存在しない場合は省略可。複数 Issue は `Closes #1, Closes #2` と並べる                           |

---

## Step 4: PR の作成

`gh-body-rules.md` の方針に従い、`--body-file -` + heredoc を使う:

```bash
gh pr create \
  --title "タイトル（Step 2 の原則に従う）" \
  --base main \
  --body-file - <<'EOF'
## 概要
- ...

## 変更内容
### component
- `src/components/...`: ...

## テスト計画
- [x] npm run lint
- [x] npm run build
- [x] npm run test（XX files / YYY tests passed）
- [ ] 受入テスト

Closes #[issue番号]
EOF
```

失敗時のフォールバック順: `--recover` → `--editor` → `--web`

---

## Step 5: 作成後の確認

- PR URL をユーザーに通知する
- `pr-semver-labeler` エージェントが未実行の場合は実行を促す
- ドキュメント更新（`docs/issue-XXX-reflection.md` 等）の漏れがないか確認する

---

## よくある間違いと対処

| 間違い                                     | 対処                                                 |
| ------------------------------------------ | ---------------------------------------------------- |
| タイトルに `feat:` などを付けてしまう      | タイトルを変更して作り直す                           |
| 本文の「変更内容」が空 or ファイルパスなし | コミット diff を見て各ファイルの変更を列挙する       |
| テスト計画が「npm run test」のみ           | テスト数とパス数を追記し、受入テスト項目を追加する   |
| Closes が抜けている                        | `gh pr edit --body` で追記するか PR 画面から直接編集 |

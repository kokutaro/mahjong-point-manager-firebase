# GitHub CLI Body Rules

`gh issue create` や `gh pr create` で複数行本文を扱うときの共通ルールです。
Issue agent と PR agent は、本文を渡す前にこのファイルの方針に従ってください。

## 基本方針

- 失敗要因は改行コードだけではなく、`--body` 直渡し時のクオート崩れ、シェル展開、特殊文字の混入です。
- 実行前に対象コマンドの `--help` を確認し、`--body-file -`、`--editor`、`--web`、`--recover` が使えることを前提にしてください。
- 本文の改行コードは **LF (`\n`) のみ** を使用し、`\r\n` (CRLF) を混在させないでください。
- 複数行本文の第一推奨は、`--body-file -` に標準入力を流す方法です。本文をシェル引数 1 個に詰め込まないため、zsh でも安定しやすいです。
- `--body` は、標準運用では単一行の短い本文に限定してください。複数行本文でも成功する場合はありますが、チェックリスト、日本語、引用符、コードブロックを含む場合は `--body-file -` を優先してください。
- 永続的な一時ファイルの作成は禁止です。ただし `--body-file -` による標準入力の利用は許可します。

## 推奨テンプレート

### Issue

```bash
gh issue create \
  --title "Issue Title" \
  --body-file - <<'EOF'
## 概要
- 背景
- 目的

## 完了条件
- [ ] 条件1
- [ ] 条件2

## メモ
- 補足
EOF
```

### PR

```bash
gh pr create \
  --title "fix: PR Title" \
  --base main \
  --head feature-branch \
  --body-file - <<'EOF'
## 概要
- 変更点A
- 変更点B

## 変更ファイル
- path/to/file1
- path/to/file2

## テスト計画
- [x] テスト1
- [x] テスト2

Closes #123
EOF
```

## 短い単一行本文の例

```bash
gh issue create --title "Issue Title" --body "Short single-line body"
gh pr create --title "PR Title" --base main --head feature-branch --body "Short single-line body"
```

## 失敗時のフォールバック

- CLI 実行が失敗した場合は、`--recover` が提示されていれば復元を優先し、その後 `--editor`、最後に `--web` の順でフォールバックしてください。

```bash
gh issue create --recover <recover-key>
gh issue create --editor
gh issue create --web

gh pr create --recover <recover-key>
gh pr create --editor
gh pr create --web
```

## 既定運用では避ける例

```bash
# 複数行本文を --body に直接詰め込む方法は動く場合もあるが、既定運用にはしない
gh issue create --title "Issue Title" --body $'1行目\n2行目'
gh pr create --title "PR Title" --base main --head feature-branch --body $'1行目\n2行目'

# 永続的な一時ファイルを作る
echo "Body" > body.txt
gh issue create --title "Issue Title" --body-file body.txt
gh pr create --title "PR Title" --base main --head feature-branch --body-file body.txt
```

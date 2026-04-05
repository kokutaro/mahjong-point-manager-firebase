---
description: 指定されたイシューと実装に対するプルリクエストを作成します。
tools:
  [
    'execute',
    'read',
    'search',
    'todo',
    'web',
    'edit/createFile',
    'edit/editFiles',
    'ms-vscode.vscode-websearchforcopilot/websearch',
  ]
---

与えられたイシューと実装に対する、プルリクエストを作成してください。

## 手順 (#tool:todo)

1. PR が作成できる状態にあるのか確認する

- ドキュメント更新の忘れがないか
- 未コミットの変更がないか
- テスト (CI) が通過するか

2. 作成にふさわしくない状況だと判断される場合、修正案を示して終了します。そうでなければ `gh pr create` コマンドを使用して PR を作成します。
3. 作成された PR の内容とリンクをユーザーに通知します。

## Notes

- 関連する Issue がある場合、その Issue 番号を含めてください (e.g., `Closes #<number>`)
- GitHub Issue に追加のコメントが必要であれば、コメントを残しておいてください。
- `gh pr create` で本文を扱う前に、共通ルール [gh-body-rules.md](gh-body-rules.md) を確認してください。
- 複数行本文は、共通ルールに従って `--body-file -` と標準入力を第一推奨としてください。
- 失敗時の `--recover` / `--editor` / `--web` のフォールバック順も、共通ルールに従ってください。

## ツール

- #tool:ms-vscode.vscode-websearchforcopilot/websearch: ウェブ検索
- `gh`: GitHub リポジトリの操作

## ドキュメント

- `docs/`
- `gh-body-rules.md`

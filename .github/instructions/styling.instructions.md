---
description: 'Use when creating or editing CSS Module files. Enforces token-based design system usage, prohibits hardcoded values, and ensures consistency with src/visuals/tokens.css.'
name: 'Styling Guidelines'
applyTo: 'src/**/*.module.css, src/visuals/**/*.css'
---

# Styling Guidelines

## トークン参照 (CRITICAL)

- すべての色値は `src/visuals/tokens.css` に定義された CSS カスタムプロパティを参照する。
- 使用可能なカラートークン:
  - 背景: `--color-bg-main`, `--color-bg-card`, `--color-bg-modal`
  - テキスト: `--color-text-primary`, `--color-text-secondary`, `--color-text-accent`
  - セマンティック: `--color-primary`, `--color-primary-hover`, `--color-danger`, `--color-info`, `--color-success`
  - ボーダー: `--color-border-subtle`
- 使用可能なスペーシングトークン: `--spacing-xs` (4px), `--spacing-s` (8px), `--spacing-m` (16px), `--spacing-l` (24px), `--spacing-xl` (32px)
- 使用可能なフォントサイズトークン: `--font-size-xs` (12px), `--font-size-s` (14px), `--font-size-m` (16px), `--font-size-l` (20px), `--font-size-xl` (24px)
- 使用可能なボーダー半径トークン: `--border-radius-s` (4px), `--border-radius-m` (8px), `--border-radius-l` (12px)

## 禁止事項

- **`#rrggbb` や `rgb()`/`rgba()` のハードコード禁止。** 新しい色が必要なら先に tokens.css にトークンを追加する。
- **tokens.css に存在しない変数名を参照しない。** 存在確認してから使用する。
- **`!important` は原則禁止。** 詳細度を見直してセレクタを修正する。
- **px 値の直書きは色やスペーシングに限り禁止。** トークンが存在する場合はトークンを使う。

## レスポンシブ

- メディアクエリのブレークポイントは `900px` (タブレット) / `660px` (モバイル) を標準とする。
- 新しいブレークポイントが必要な場合はチーム合意の上で追加する。

## ファイル命名

- CSS Module ファイルは対応する TSX と同名: `ComponentName.module.css`
- CSS Module ファイルのないコンポーネントを作らない。

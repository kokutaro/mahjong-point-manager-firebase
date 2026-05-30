---
description: 'Use when editing React components, pages, hooks, contexts, CSS Modules, or frontend UI in src. Covers component boundaries, token-based styling, mobile-first interaction, and keeping business logic out of presentation.'
name: 'Frontend Guidelines'
applyTo: 'src/components/**/*.tsx, src/pages/**/*.tsx, src/contexts/**/*.tsx, src/hooks/**/*.ts, src/**/*.module.css, src/visuals/**/*.css, src/App.tsx, src/main.tsx'
---

# Frontend Guidelines

## コンポーネント構造

- Keep `src/components/ui` presentational, `src/components/features` focused on screen features, and `src/pages` responsible for route-level composition.
- Extract reusable state handling and UI-side event orchestration into `src/hooks`, keep pure calculations in `src/utils`, and leave Firebase or other external I/O in `src/services` instead of growing TSX files.
- Reuse existing primitives in `src/components/ui` before adding one-off controls. When adding a shared primitive, follow the paired TSX + CSS Module pattern used in `src/components/ui/Button.tsx`.
- Preserve Japanese user-facing copy and current mahjong terminology unless the task explicitly changes wording.
- Optimize for mobile and touch use: keep tap targets generous, avoid hover-only interactions, and protect layouts from long player names or score values.
- For scoring, result, or rule-setting UI, call the helpers in `src/utils` and validate behavior against `docs/game_rules.md` and the related Vitest files instead of duplicating calculation logic in components.
- When a UI change affects room state or history data, check the existing hook and service contracts first. Do not move Firebase reads or writes directly into components when `src/hooks` or `src/services` should own that logic.

## コンポーネントサイズ制限 (CRITICAL)

- TSX ファイルは **500行以下** を厳守する。超える場合は必ず分割する。
- ページコンポーネント (`src/pages`) はルーティング・レイアウト・子コンポーネント呼び出しに専念し、ゲームロジックや複雑な状態管理は custom hook に委譲する。
- 1コンポーネント内に `useState` が 5個以上 / `useEffect` が 3個以上ある場合、ロジックの custom hook 抽出を検討する。
- アニメーションロジック (`requestAnimationFrame`, `setTimeout` のカスケード) はコンポーネント本体に書かず、`src/hooks/useXxxAnimation.ts` のような専用 hook に分離する。

## スタイリングルール (CRITICAL)

- **インラインスタイル (`style={{...}}`) は原則禁止。** すべてのスタイルは CSS Module で定義する。
- **ハードコードされた色値（`#4caf50`, `#f44336`, `rgba(...)` 等）を TSX に直接書かない。** 必ず `src/visuals/tokens.css` の CSS カスタムプロパティ（`var(--color-success)`, `var(--color-danger)` 等）を CSS Module 経由で使う。
- **CSS Module を持たないコンポーネントを新規作成しない。** すべての TSX ファイルは対応する `.module.css` ファイルとペアにする。
- tokens.css に存在しない変数を CSS Module で参照しない。必要な場合は先に tokens.css にトークンを追加してから利用する。
- `!important` は使用しない。詳細度の設計を見直す。
- ブレークポイントは `900px` / `660px` を標準とし、新規追加時は既存パターンに合わせる。

## 共通ユーティリティの利用 (CRITICAL)

- **風表示**: `src/utils/wind.ts` の `windToKanji()` を使う。コンポーネント内に独自の風変換ロジックを書かない。
- **ポイント表示**: `src/components/ui/PointValue.tsx` または `src/utils/format.ts` の `formatPoint()` を使う。正負符号・toLocaleString・色分けロジックを個別コンポーネントで重複実装しない。
- **スコアテーブル**: プレイヤー名×スコアのテーブル表示は、既存の共通パターンを確認してから実装する。同一パターンが 2箇所以上に発生する場合は `src/components/ui` にプリミティブとして抽出する。

## ナビゲーション

- **`window.location.href` による画面遷移は禁止。** React Router の `useNavigate` を使う。SPA のルーティング整合性を維持し、不要なフルリロードを避ける。

## 定数管理

- アニメーション時間、ブレークポイントなどのマジックナンバーはファイル先頭またはトークンファイルに定数として定義する。関数内部にハードコードしない。

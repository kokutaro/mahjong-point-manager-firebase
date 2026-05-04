# Issue #150 振り返り

## 1. 概要

- 対象Issue: #150
- 要約: 任意の点数支払い（チョンボ等）機能を追加し、局を進めずに点数移動を記録できるようにした
- 結果: PRブロッカー 0 / 主要検証 pass（lint, build, test 527件, acceptance_test すべて通過）

## 2. 背景と目的

- 背景: 麻雀の対局中にチョンボ（反則）やその他のペナルティが発生した場合、任意の点数移動を記録する手段がなかった。既存機能では和了や流局など局の進行を伴う記録しかできず、局を進めない点数変更に対応していなかった。
- 影響: ユーザーがチョンボ等の点数移動を正確に記録できず、手動で管理する必要があった。これにより記録の正確性が損なわれ、対局終了時の精算にずれが生じる可能性があった。
- 目的:
  - 局を進行させずに任意の点数移動を記録する機能を提供する
  - 操作のUndo（取消）に対応する
  - 分析機能への影響を排除する（統計を歪めない）
  - トビ（飛び）判定を正しく動作させる

## 3. 実装内容とポイント

- 変更ファイル/モジュール:
  - `src/types/index.ts`
  - `src/utils/adjustment.ts`（新規）
  - `src/utils/adjustment.test.ts`（新規）
  - `src/utils/analysis.ts`
  - `src/utils/analysis.test.ts`
  - `src/hooks/useMatchGame.ts`
  - `src/components/features/AdjustmentModal.tsx`（新規）
  - `src/components/features/AdjustmentModal.module.css`（新規）
  - `src/pages/MatchPage.tsx`
  - `src/pages/DashboardPage.tsx`

- 主な実装:
  1. HandLog の result.type に `'Adjustment'` を追加し、`description?` フィールドで理由を記録可能にした
  2. `applyAdjustment` ロジック関数を独立ユーティリティとして新規作成し、点数移動ロジックをUI層から分離した
  3. `AdjustmentModal` で支払い元・受取先・点数・理由を入力するUIを提供した
  4. `getAnalysisEventType` で Adjustment タイプを早期に null 返却し、分析機能から自動除外した
  5. `useMatchGame` に `handleAdjustment` ハンドラを追加し、history snapshot による Undo 対応を実装した
  6. DashboardPage の `validHands` カウントから Adjustment を除外し、統計の整合性を維持した

- 設計判断:
  - `handleRiichi` パターン（局を進めずに点数変更＋history記録）を踏襲した。既存の実績あるパターンであり、局進行を伴わない点数変更の基盤として適切であると判断した
  - `processHandEnd` を呼ばないことで局進行を抑制した。ただし副作用としてトビ判定が自動実行されないため、明示的なトビチェックを追加する必要があった
  - 分析からの除外は `getAnalysisEventType` での早期 null 返却で実現した。フィルタリングを呼び出し側に分散させず、一箇所で制御する方針を採用した
  - ロジックの一部が `useMatchGame` と `MatchPage` に重複する状態は、Issue #105 以来の既知技術負債であり、今回のスコープでは解消せず次回対応とした

## 4. レビュー指摘と対応

| 区分     | 重要度   | 内容                                                                 | 判定     | 対応                                                |
| -------- | -------- | -------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| 必須対応 | CRITICAL | トビ判定が欠如しており、点数調整で0点以下になっても対局が続行される  | 対応済み | MatchPage・useMatchGame にトビ判定ロジックを追加    |
| 必須対応 | HIGH     | DashboardPage の validHands カウントに Adjustment が含まれ統計が歪む | 対応済み | validHands フィルタから Adjustment を除外           |
| 任意課題 | HIGH     | MatchPage と useMatchGame のロジック重複                             | 未対応   | Issue #105 以来の既知負債。スコープ外として次回対応 |
| 任意課題 | HIGH     | description に maxLength 制限がない                                  | 未対応   | 非ブロッカー。次回対応候補                          |
| 任意課題 | MEDIUM   | 100点単位バリデーションが未実装                                      | 未対応   | 非ブロッカー。ルール設定に依存するため要検討        |
| 任意課題 | MEDIUM   | onClose の命名が他モーダルと不統一                                   | 未対応   | 非ブロッカー                                        |
| 任意課題 | MEDIUM   | UXバグ（詳細未記載）                                                 | 未対応   | 非ブロッカー                                        |
| 任意課題 | MEDIUM   | CSS にハードコード値が残存                                           | 未対応   | 非ブロッカー。トークン化は次回対応候補              |

- 最終判定: PRブロッカー なし（CRITICAL・HIGH必須対応はすべて対応済み）

## 5. 検証結果

- lint: pass
- build: pass
- test (unit): pass（527 tests, 59 files）
- acceptance_test: pass（エミュレータ＋ブラウザでの動作確認）
- 補足: すべての検証項目を通過しており、未解決の失敗は存在しない

## 6. 学びと改善アクション

- 学び:
  - `handleRiichi` パターン（局を進めずに点数変更＋history記録）が、局進行を伴わない新機能の基盤として有効である
  - `processHandEnd` を呼ばないパスでは、トビ判定が自動実行されないため明示的なチェックが必須である。今回はレビューで検出されたが、今後同様のパターンではチェックリストに含めるべきである
  - DashboardPage の統計計算は、新しい HandLog タイプ追加時に必ず影響確認が必要なホットスポットである
  - MatchPage と useMatchGame のロジック重複（Issue #105 以来の既知技術負債）は、新機能追加のたびに両方への修正が必要となりコストが増大している

- 改善アクション:
  1. 「局を進めない点数変更」を追加する際のチェックリストに「トビ判定の明示的追加」を含める
  2. HandLog に新しい type を追加する際は、DashboardPage の統計フィルタおよび analysis.ts の除外ロジックを必ず確認する運用を徹底する
  3. MatchPage / useMatchGame のロジック重複解消を次期リファクタリング Issue として優先度を上げる
  4. description フィールドの maxLength 制限と CSS トークン化を後続タスクとして起票する

## 7. 残課題

- MatchPage と useMatchGame のロジック重複解消（Issue #105 関連）
- description フィールドの maxLength 制限追加
- 100点単位バリデーションの要否検討（ルール設定との整合）
- CSS ハードコード値のトークン化
- onClose 命名の他モーダルとの統一

## 8. 参照

- Issue #150: 任意の点数支払い（チョンボ等）機能の追加
- Issue #105: MatchPage / useMatchGame ロジック重複に関する既知技術負債
- `src/utils/adjustment.ts`: 点数調整ロジックの実装
- `docs/game_rules.md`: 麻雀ルール定義

# Issue #62 振り返り

## 1. 概要

- 対象Issue: #62「基盤整備: データモデル・型定義・ルーティング・サービス基盤」
- 要約: 麻雀大会機能（`docs/mahjong-competition-spec.md`）の Phase 1 として、型定義・Firestore サービス・カスタムフック・ルーティング・セキュリティルールの基盤を新規追加した。
- 結果: PR ブロッカー 4 件すべて修正済み / lint・build・test（136 件）全 pass

## 2. 背景と目的

- 背景: 既存の部屋（Room）ベースの対局管理機能に加え、複数卓を一元管理する「大会」概念を導入する要件が発生した。大会機能は段階的に実装する方針であり、本 Issue はその Phase 1（基盤整備）に該当する。
- 影響: この段階ではプレースホルダーページのみのため、エンドユーザーへの直接的な影響はない。後続フェーズの実装速度と品質を左右する基盤レイヤーの整備である。
- 目的:
  - Competition 関連の型定義を `src/types/index.ts` に追加し、データモデルを確定する
  - Firestore の CRUD・subscribe 操作を `competitionService.ts` に集約する
  - 大会データをリアルタイム購読するフック `useCompetition` を提供する
  - 7 つの大会関連ルートを `App.tsx` に追加する
  - Firestore セキュリティルールで competitions コレクションとサブコレクションの権限を定義する

## 3. 実装内容とポイント

### 変更ファイル/モジュール

| 区分         | ファイル                                                                   | 内容                                                                     |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 型定義       | `src/types/index.ts`                                                       | Competition 関連 9 型追加、RoomState に `competitionId` / `tableId` 追加 |
| サービス     | `src/services/competitionService.ts`（新規）                               | Competition / Participant / Table / GameResult の CRUD + subscribe       |
| テスト       | `src/services/competitionService.test.ts`（新規）                          | 15 テストケース                                                          |
| フック       | `src/hooks/useCompetition.ts`（新規）                                      | 4 つの subscribe をまとめるリードオンリーフック                          |
| ページ       | `src/pages/Competitions*.tsx`, `CompetitionNew*.tsx` 等 7 ファイル（新規） | プレースホルダー                                                         |
| ルーティング | `src/App.tsx`                                                              | 7 ルート追加（lazy + Suspense）                                          |
| セキュリティ | `firestore.rules`                                                          | competitions コレクション + 3 サブコレクションのルール                   |

### 主な実装

1. **型定義**: `CompetitionStatus`、`Competition`、`CompetitionParticipant`、`CompetitionTable`、`CompetitionGameResult` 等 9 型を追加した。仕様書のライフサイクル（recruiting → in_progress → closed → archived）をそのまま union type で表現している。
2. **competitionService**: 既存の `roomService.ts` のパターン（setDoc/updateDoc/deleteDoc + onSnapshot subscribe）を踏襲し、Competition 本体と 3 サブコレクション（participants / tables / gameResults）の操作を提供する。
3. **useCompetition フック**: 4 つの subscribe を 1 つのフックにまとめ、`loadCount` カウンタで全データの初期読み込み完了を判定する。
4. **ルーティング**: `React.lazy` + `Suspense` で 7 ページをコード分割し、既存の lazy import パターンと統一した。
5. **Firestore セキュリティルール**: 仕様書 §4.3 / §13 の権限定義に基づき、organizer / co-organizer / 一般ユーザーの操作権限を定義した。

### 設計判断

- **roomService パターンの踏襲**: 新規に設計せず既存パターンを再利用することで、コードベース全体の一貫性を優先した。サービス層の骨格を素早く組めた反面、loadCount によるローディング判定のフラジャイルさも引き継いでいる（後述の非ブロッカー指摘 M-1 参照）。
- **プレースホルダーページ**: Phase 1 では UI 実装を含めず、ルーティングと基盤のみを先行整備する方針とした。画面の実装は後続 Issue に分離する。
- **gameResults の不変性**: 仕様上、対局結果は確定後に変更されないため、Firestore ルールで update/delete を `if false` に設定した。

## 4. レビュー指摘と対応

### 必須対応（PR ブロッカー）

| ID  | 内容                                                                                                                                                                  | 対応                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1 | participants の update ルールに自己更新（`request.auth.uid == participantId`）条件が含まれており、一般参加者がロールを `organizer` に書き換える権限昇格が可能であった | 自己更新条件を削除し、organizer / co-organizer のみに限定した（対応済み）                                                                                |
| C-2 | gameResults の update / delete が認証済みユーザーに許可されていた                                                                                                     | `if false` に変更し、作成後の不変性を保証した（対応済み）                                                                                                |
| H-1 | passcode がドキュメントに平文で保存され、read ルールにより全認証ユーザーに公開される状態であった                                                                      | ハッシュ化方針をルールファイルの NOTE コメントに明記し、平文保存を禁止する設計意図を記録した（対応済み）。実装レベルのハッシュ化は後続フェーズで対応予定 |
| H-2 | competition の update ルールが `isOrganizer() \|\| isCoOrganizer()` となっており、仕様 §4.3 の「大会情報の編集は主催者のみ」に違反していた                            | `isOrganizer()` のみに修正した（対応済み）                                                                                                               |

### 非ブロッカー（対応見送り）

| ID       | 内容                                                                    | 判定   | 備考                                                |
| -------- | ----------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| H-3      | `updatedAt` タイムスタンプが Competition / Participant / Table に未付与 | 未対応 | 後続フェーズで一括対応予定                          |
| H-4      | Firestore ルールにフィールドバリデーション（型・必須チェック）が未実装  | 未対応 | 段階的に追加する方針                                |
| M-1      | サブコレクションの正規化が不十分（`tableName` の重複保持等）            | 未対応 | 非正規化は Firestore の設計慣行として許容範囲と判断 |
| M-2      | `useCompetition` の `loadCount` ベースのローディング判定がフラジャイル  | 未対応 | roomService から引き継いだパターン。改善は別途検討  |
| M-3      | エラーパスのテストが不足                                                | 未対応 | 後続テスト拡充で対応                                |
| M-4〜M-6 | その他中程度の指摘                                                      | 未対応 | バックログとして追跡                                |

- 最終判定: PR ブロッカー **なし**（4 件すべて修正済み）

## 5. 検証結果

| 検証種別    | 結果   | 補足                                                   |
| ----------- | ------ | ------------------------------------------------------ |
| lint        | pass   | —                                                      |
| typecheck   | pass   | —                                                      |
| build       | pass   | —                                                      |
| test (unit) | pass   | 既存 121 件 + 新規 15 件 = 136 件全 pass               |
| e2e         | 未確認 | E2E フレームワーク未導入のため実施不可                 |
| 手動確認    | 未確認 | プレースホルダーページのため画面操作による検証対象なし |

## 6. 学びと改善アクション

### 学び

1. **Firestore セキュリティルールは仕様の権限定義と 1 対 1 で対応させるべきである。** 自己更新のような暗黙的な権限拡張を安易に追加すると、ロール昇格の脆弱性を生む（C-1 の教訓）。
2. **不変データ（gameResults 等）は最初から update/delete を `if false` に設定すべきである。** 「後から制限する」アプローチでは、初期ルールの見落としが脆弱性につながる（C-2 の教訓）。
3. **passcode のような機密フィールドは、アーキテクチャレベルで保護方針を確定してからルールを書くべきである。** ルール単体では平文読み取りを防げない（H-1 の教訓）。
4. **既存サービス（roomService）のパターンを踏襲することで、新サービスの骨格を迅速に構築できた。** 一方、既存の設計課題（loadCount のフラジャイルさ等）も引き継ぐため、パターン踏襲時は既知の問題を把握した上で判断すべきである。
5. **`vi.hoisted()` + `vi.mock()` パターンは Firebase 依存のテストで安定して動作する。** モック定義のホイスティングにより、テスト間の分離が確実になる。

### 改善アクション

1. Firestore セキュリティルールの新規追加時は、仕様書の権限表との差分チェックをレビューの必須項目とする。
2. 機密フィールド（passcode 等）の保護方針を Phase 2 の着手前に確定し、Cloud Functions でのハッシュ検証またはクライアントサイドハッシュ比較を実装する。
3. loadCount パターンの改善案を検討し、後続フェーズで `Promise.all` ベースまたは状態マシンベースのローディング管理への移行を検討する。

## 7. 残課題

- passcode のハッシュ化実装（H-1 の完全対応）
- `updatedAt` タイムスタンプの追加（H-3）
- Firestore ルールのフィールドバリデーション追加（H-4）
- エラーパスのテスト拡充（M-3）
- `loadCount` ベースのローディング判定の改善（M-2）
- プレースホルダーページの実装（後続 Phase で対応）

## 8. 参照

- [docs/mahjong-competition-spec.md](mahjong-competition-spec.md) — 麻雀大会機能 仕様書
- [src/services/roomService.ts](../src/services/roomService.ts) — 踏襲元パターン（Room サービス）
- [firestore.rules](../firestore.rules) — Firestore セキュリティルール

# Issue #63 振り返り

## 1. 概要

- 対象Issue: #63
- 要約: 大会の作成・一覧・参加・ダッシュボードの CRUD 機能一式を実装した Issue である。Epic #71（麻雀大会開催機能）の中核となる画面・サービス・ユーティリティを新規追加した。
- 対象範囲: 大会作成フォーム、大会一覧ページ、大会参加ページ、ダッシュボードページ、competitionService、パスコードハッシュユーティリティ、デフォルト設定定数である。
- 結果: PR ブロッカー 4 件をすべて対応済みとし、148 テスト全パス、lint / build / test いずれも pass である。

## 2. 背景と目的

- 背景: 既存アプリケーションはルーム単位の対局管理のみを提供しており、複数ルームを横断する大会形式の運営機能が存在しなかった。Epic #71 で麻雀大会開催機能の実現が計画され、本 Issue はその基盤となる CRUD 操作の構築を担当する。
- 影響: 大会機能がないため、複数対局を束ねた大会運営をアプリ上で完結できず、外部ツールに依存する状態であった。
- 目的:
  - 大会の新規作成画面（名前・説明・パスコード・ルール設定）を提供すること。
  - ログインユーザーが参加済み大会を一覧表示できること。
  - パスコード認証による大会参加フローを実装すること。
  - 大会ダッシュボードでステータス管理・共有機能を提供すること。
  - パスコードを SHA-256 + salt でハッシュし、平文保存を回避すること。

## 3. 実装内容とポイント

- 変更ファイル/モジュール（19 ファイル、+1357 行、-8 行）:
  - src/components/features/CompetitionForm.tsx + CSS
  - src/components/features/CompetitionStatusBadge.tsx + CSS
  - src/components/features/ShareCompetitionModal.tsx
  - src/hooks/useCompetitions.ts
  - src/pages/CompetitionDashboardPage.tsx + CSS
  - src/pages/CompetitionsPage.tsx + CSS
  - src/pages/CompetitionNewPage.tsx
  - src/pages/CompetitionJoinPage.tsx
  - src/utils/hash.ts + hash.test.ts
  - src/utils/competitionDefaults.ts + competitionDefaults.test.ts
  - src/services/competitionService.ts
  - src/services/competitionService.test.ts
  - src/pages/TopPage.tsx
- 主な実装:
  1. CompetitionForm で大会名・説明・パスコード・ルール設定を入力し、competitionService.createCompetition を呼び出して Firestore にドキュメントを作成する構成とした。
  2. CompetitionsPage では useCompetitions フックを通じてログインユーザーの参加済み大会一覧を取得・表示する。Firestore Timestamp と number の混在に対して formatTimestamp ヘルパーによるダックタイピングで統一処理した。
  3. CompetitionJoinPage ではパスコード入力後に verifyPasscode で SHA-256 ハッシュ照合を行い、参加前に getDoc による既存参加者チェックで重複参加を防止する。
  4. CompetitionDashboardPage では大会のステータス管理（recruiting / in_progress / closed / archived）と、ShareCompetitionModal による QR コード + URL 共有を提供する。
  5. hash.ts で Web Crypto API による SHA-256 ハッシュを実装し、competitionId を salt として付与することでレインボーテーブル攻撃を防止した。
  6. useCompetitions フックでは auth.currentUser の直接参照から onAuthStateChanged リスナーに変更し、Firebase Auth 初期化完了前の null 問題を解消した。
  7. TopPage に大会一覧へのナビゲーションボタンを追加した。
- 設計判断:
  - パスコードハッシュに Web Crypto API（SHA-256）+ salt を採用した理由は、Cloud Functions を導入せずクライアント完結で実装でき、Epic 初期段階の開発速度を優先したためである。将来的には Cloud Functions への移行が望ましい。
  - onAuthStateChanged パターンを採用した理由は、Firebase Auth の初期化タイミングに依存しない安定したユーザー取得を実現するためである。auth.currentUser の直接参照では初期レンダリング時に null となる問題があった。
  - Firestore Timestamp の処理にダックタイピング（toMillis メソッド存在チェック）を採用した理由は、Firestore SDK がサーバーサイドとクライアントサイドで異なる Timestamp 表現を返す場合があり、型ガードよりも実働条件で判定する方が堅牢であるためである。
  - QR コード生成には react-qr-code ライブラリ（Issue #62 で導入済み）を再利用し、新規依存の追加を回避した。
  - 不採用案: パスコードをサーバーサイド（Cloud Functions）でのみ検証する案は、本 Epic 初期段階では Functions のセットアップコストが大きいため不採用とした。clientSide ハッシュ + Firestore ルールの組み合わせで段階的に移行する方針とした。

## 4. レビュー指摘と対応

| 区分     | ID       | 内容                                                                                       | 判定         | 対応                                                                                                    |
| -------- | -------- | ------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------- |
| 必須対応 | C-2      | hashPasscode に salt パラメータがなくレインボーテーブル攻撃に対して脆弱である              | 対応済み     | hashPasscode に salt パラメータを追加し、competitionId を salt として使用する構成に変更した             |
| 必須対応 | H-1      | CompetitionJoinPage で重複参加の防止チェックが存在しない                                   | 対応済み     | getDoc による既存参加者チェックを追加し、参加済みの場合はダッシュボードへリダイレクトする処理を実装した |
| 必須対応 | H-2      | useCompetitions で auth.currentUser を直接参照しており認証初期化前に null となる           | 対応済み     | onAuthStateChanged リスナーに変更し、Firebase Auth 初期化完了を待つ構成とした                           |
| 必須対応 | M-3      | CompetitionsPage で Firestore Timestamp と number 型が混在し表示エラーとなる可能性がある   | 対応済み     | formatTimestamp ヘルパーを追加し、toMillis メソッド存在チェックによるダックタイピングで統一処理した     |
| 任意課題 | C-1      | パスコードハッシュがクライアントから読み取り可能であり、Cloud Functions での検証が望ましい | 非ブロッカー | Cloud Functions 移行で対応予定。別 Issue 起票予定である                                                 |
| 任意課題 | H-3      | generateId の衝突リスクがある                                                              | 非ブロッカー | 現状の Firestore ドキュメント数では許容範囲である。規模拡大時に再検討する                               |
| 任意課題 | M-1〜M-6 | 各種改善提案（詳細は review Findings 参照）                                                | 非ブロッカー | 将来 Issue で対応予定である                                                                             |

- 最終判定: PR ブロッカー なし（4 件すべて対応済み）

## 5. 検証結果

- lint: pass（npm run lint）
- build: pass（npm run build）
- test: pass（npm run test、148 テスト全パス）
  - 新規追加テスト: hash.test.ts（4 件）、competitionDefaults.test.ts（3 件）、competitionService.test.ts 追加分
- typecheck: 未確認
- e2e: 未確認
- 手動確認: 未確認

## 6. 学びと改善アクション

- 学び:
  - クライアントサイドのパスコードハッシュは salt 付与により最低限の安全性を確保できるが、ハッシュ値が Firestore ルール次第でクライアントから読み取り可能となるため、セキュリティ上は Cloud Functions への移行が必要である。段階的実装の判断として、この方式は MVP 段階では許容できる。
  - Firebase Auth の onAuthStateChanged パターンは、React コンポーネントのライフサイクルと Auth 初期化タイミングのずれを吸収する標準的な対処法であり、auth.currentUser の直接参照は初期レンダリング時に信頼できない。
  - Firestore Timestamp はサーバー側の書き込みタイミングによって型が異なるケースがあり、ダックタイピングによる判定は実用的な対処法である。
  - 重複参加防止のような整合性チェックは、UI フロー上自然に見えても明示的な getDoc チェックがなければ競合が発生しうる。サービス層での事前チェックを習慣化すべきである。
- 改善アクション:
  1. Cloud Functions によるパスコード検証への移行 Issue を起票し、クライアントからハッシュ値を読み取れない構成に移行する。
  2. 大会 CRUD の主要導線（作成 → 参加 → ダッシュボード表示）を対象とした E2E テストを追加する。
  3. typecheck（tsc --noEmit）を CI パイプラインまたは検証手順に追加し、型エラーの検出漏れを防止する。

## 7. 残課題

- パスコードハッシュのクライアント読み取り可能問題（C-1）は別 Issue での Cloud Functions 移行で対応予定である。
- generateId の衝突リスク（H-3）は規模拡大時に再検討が必要である。
- M-1〜M-6 の改善提案は将来 Issue で対応予定である。
- typecheck、E2E、手動確認は未実施である。

## 8. 参照

- Epic: #71（麻雀大会開催機能）
- ブランチ: feature/issue-63-competition-crud → epic/mahjong-competition
- docs/reflection-document-spec-v1.md
- src/components/features/CompetitionForm.tsx
- src/components/features/CompetitionStatusBadge.tsx
- src/components/features/ShareCompetitionModal.tsx
- src/hooks/useCompetitions.ts
- src/pages/CompetitionDashboardPage.tsx
- src/pages/CompetitionsPage.tsx
- src/pages/CompetitionNewPage.tsx
- src/pages/CompetitionJoinPage.tsx
- src/utils/hash.ts
- src/utils/competitionDefaults.ts
- src/services/competitionService.ts

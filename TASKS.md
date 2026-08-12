# 実装計画チェックリスト

## 基本方針

- README.md の機能要件と AGENTS.md のコーディングルールを守る
- 1タスクごとに小さく実装し、レビューしやすい粒度で進める
- Cloudflare D1 / Workers への本番反映は本作業対象外とし、ローカル検証とビルド確認を優先する

---

## Phase 1: プロジェクト基盤と共通定義

- [ ] 既存のルート構成と命名規約を確認し、今後追加するファイルの配置方針を固定する
- [ ] `shared/constants/` に HTTP ステータスと各種定数を整理する
- [ ] `shared/helpers/` に汎用ヘルパーを整理し、既存の `isEmpty` などの命名と用途を統一する
- [ ] `shared/types/` 配下に DB テーブルごとの型定義を作成する
- [ ] `server/types/` 配下にサーバサイド専用の型を作成する
- [ ] `server/repositories/` 配下に DB 操作クラスを追加する方針を定義する
- [ ] `server/services/` にサーバロジックを切り出す構成を決める
- [ ] アプリ全体で使うレスポンス形式を統一する（`result` / `error`）

---

## Phase 2: データモデルと DB 周りの実装

- [ ] D1 SQLite の各テーブルに対応する型定義を作成する
  - [ ] `holomems`
  - [ ] `cards`
  - [ ] `board_nodes`
  - [ ] `holowork_achievements`
  - [ ] `holoworks`
  - [ ] `active_holowork_members`
  - [ ] `memo`
- [ ] `holomems` 新規追加時に `cards` の星3・4・5レコードを自動生成するロジックを実装する
- [ ] `cards` の並び順・レア度・保有状況に対応するクエリを定義する
- [ ] `board_nodes` のカテゴリ制約 (`red|blue|yellow|green`) と `yellow_target` を反映する
- [ ] `holowork_achievements` の閾値計算ロジックを共通化する
- [ ] `holoworks` の削除制約（`active_holowork_members` がない場合のみ削除可能）を API で保証する
- [ ] `active_holowork_members` のユニーク制約は DB / API の両方で守るように設計する
- [ ] `memo` の単一レコード運用と保存/更新処理を実装する
- [ ] 主要な Repository の実装を作成する
  - [ ] `HolomemRepository`
  - [ ] `CardRepository`
  - [ ] `BoardNodeRepository`
  - [ ] `HoloworkAchievementRepository`
  - [ ] `HoloworkRepository`
  - [ ] `ActiveHoloworkMemberRepository`
  - [ ] `MemoRepository`

---

## Phase 3: 認証と API ルーティング

- [ ] `ADMIN_JWT_SECRET` を使った JWT 認証の仕組みを実装する
- [ ] ログイン API `POST /api/login` を作成する
  - [ ] 環境変数で渡されたパスワードと照合する
  - [ ] JWT を発行し、Zustand の LocalStorage 永続化で保持する前提に合わせる
  - [ ] 失敗時は適切な 401 / 400 を返す
- [ ] API ルートの整理を行い、各リソースを `server/routes/api/...` に追加する
- [ ] `GET /api/holomems` / `POST /api/holomems` / `PATCH /api/holomems/:id` を実装する
- [ ] `GET /api/cards` / `POST /api/cards` / `PATCH /api/cards/:id` を実装する
- [ ] `GET /api/board-nodes` / `POST /api/board-nodes` / `PATCH /api/board-nodes/:id` を実装する
- [ ] `GET /api/holowork-achievements` / `PATCH /api/holowork-achievements/:id` を実装する
- [ ] `GET /api/holoworks` / `POST /api/holoworks` / `DELETE /api/holoworks/:id` を実装する
- [ ] `GET /api/active-holowork-members` / `POST /api/holoworks/:id/start` / `POST /api/holoworks/:id/complete` / `POST /api/holoworks/:id/abort` を実装する
- [ ] `GET /api/holoworks/:id/candidates?priority=...` を実装する
- [ ] `GET /api/memo` / `PATCH /api/memo` を実装する
- [ ] 各 API のバリデーションを Zod で定義し、入力不備を 400 で返す
- [ ] 共通エラーハンドリングを設けて `error` に統一する

---

## Phase 4: フロントエンド基盤と画面遷移

- [ ] React Router v7 の画面構成を整理し、`/` と `/home` を含むルートを定義する
- [ ] ログイン状態に応じてトップページとメインページの遷移を実装する
- [ ] `client/stores/` に認証状態と共通状態を持つストアを作成する
- [ ] `client/helpers/` に API 呼び出し用ラッパーを作成する
- [ ] トップページにログインフォームを作成する
- [ ] ログイン済みユーザーは `/home` へリダイレクトする
- [ ] JWT 無効時にトップへ戻すガード処理を実装する
- [ ] サイドメニューを共通レイアウトとして実装する
- [ ] `/home` のメインメニューを作成する
  - [ ] ホロワーク管理
  - [ ] ホロメン管理
  - [ ] カード管理
  - [ ] ホロメンボード管理
- [ ] `memo` の自動保存と保存メッセージ表示を実装する
- [ ] 最終保存日時を表示する

---

## Phase 5: 個別管理画面の実装

- [ ] `/holomems` の一覧表示・編集画面を作成する
  - [ ] `sort_order` に基づく並び順
  - [ ] `is_active` 切り替え
  - [ ] `note` 編集
  - [ ] 新規ホロメン追加
- [ ] `/cards` の一覧表示・編集画面を作成する
  - [ ] `holomems.sort_order` → `rarity DESC` → `id ASC` を反映
  - [ ] `is_owned` のチェックボックス
  - [ ] レベルと開花度の編集
- [ ] `/board-nodes` の一覧表示・編集画面を作成する
  - [ ] カテゴリごとにグループ化
  - [ ] `id ASC` で並び替え
  - [ ] `holomems.note` の編集可能化
- [ ] `/holoworks` のホロワーク管理ページを作成する
  - [ ] 枠ごとの活動中メンバー表示
  - [ ] 「開始」「完了」「中断」操作を追加
  - [ ] 優先度モード選択
  - [ ] 他枠で活動中のメンバーを非活性表示
  - [ ] 候補表示の上位表示ロジック
- [ ] ホロワーク一覧の下部にホロメン一覧を表示する
  - [ ] `holowork_achievements` の回数 / 次閾値 / 残回数
  - [ ] 黄マス情報
  - [ ] カード所持・レベル状況

---

## Phase 6: ホロワーク優先候補ロジック

- [ ] ホロメン候補算出の優先度モードを定義する
  - [ ] `count`
  - [ ] `lesson_pt`
  - [ ] `cube`
  - [ ] `training`
- [ ] 各候補に対して黄マス情報と達成回数を取り込む
- [ ] 今回の枠で活動中のホロメンを除外するロジックを実装する
- [ ] 優先候補 API のレスポンス形式を固定する
- [ ] UI で候補表示の並び順と非活性状態を反映する

---

## Phase 7: 画面の状態管理と UX

- [ ] ローディング表示とエラー表示を統一する
- [ ] 保存成功時の「保存しました」メッセージを一定秒で自動消去する
- [ ] フォーム送信後の再取得と最終更新時刻の更新を行う
- [ ] 一覧画面の編集結果を即時反映する
- [ ] 一部画面でのフォームバリデーションを実装する
- [ ] 最低限のモバイル対応を行う（ハンバーガーメニュー、狭い画面でも操作可能）

---

## Phase 8: 検証と仕上げ

- [ ] `npm run lint` の実行と改善を行う
- [ ] `npm run build` の実行と型エラー・ビルドエラーの解消を行う
- [ ] 主要 API のエンドポイントを手動で確認する
- [ ] ログインフローの挙動を確認する
- [ ] ホロワーク開始・完了・中断の操作フローを確認する
- [ ] 最終的なコードの整理と命名の統一を行う
- [ ] README と実装差分が合っているか最終確認する

---

## 実装優先順位（最初に着手する順）

1. 共通型・Repository・API 構造の整理
2. 認証とログイン機能
3. `holomems` / `cards` / `board-nodes` の基本 CRUD
4. `holoworks` と `active_holowork_members`
5. 優先候補ロジックと UI
6. 最終的な UX 整備と検証

---

## 確認事項・未確定事項

- [ ] 環境変数名（`ADMIN_JWT_SECRET` など）は README と実装で一致しているか最終確認する
- [ ] 画面遷移のルーティングに必要な追加ページ数を見積もる

---

## 実装開始時の最小単位

### Task 1: 認証基盤と API 共通レスポンスの定義

- [ ] 既存の Hono ルート構造を確認し、認証用の API ルートを追加する
  - [ ] [server/routes/api/api.ts](server/routes/api/api.ts) に認証ルートを組み込む
  - [ ] [server/routes/api/login/login.ts](server/routes/api/login/login.ts) を新規作成する
- [ ] サーバー共通のレスポンス形式を固定する
  - [ ] 200 系成功時は `{ result: ... }` を返す
  - [ ] 失敗時は `{ error: ... }` を返す
  - [ ] 例外時の共通ハンドリングを整える
- [ ] JWT 認証の基盤を作る
  - [ ] `ADMIN_JWT_SECRET` を利用する
  - [ ] `hono/jwt` を使って JWT を検証する
  - [ ] 認証失敗時の 401 レスポンスを定義する
- [ ] `POST /api/login` の入力・出力を定義する
  - [ ] 入力: `{ password: string }`
  - [ ] 成功: JWT 発行
  - [ ] 失敗: 400 / 401
- [ ] ルートガードを作る準備を行う
  - [ ] ログイン済み判定の共通ヘルパーを用意する
  - [ ] 次のタスクでホロメン API などに適用できる形にする
- [ ] 既存のサンプル実装を整理し、Task 1 で扱う API 以外のサンプルを分離する
  - [ ] [server/routes/api/example/example.ts](server/routes/api/example/example.ts) は参考用途に限定する

### 実装時のファイル候補

- [server/routes/api/login/login.ts](server/routes/api/login/login.ts) : ログイン API
- [server/helpers/hash-password.ts](server/helpers/hash-password.ts) : パスワード比較用のヘルパー
- [server/types/hono-bindings.ts](server/types/hono-bindings.ts) : 環境変数の型を整備
- [shared/constants/http-status-code.ts](shared/constants/http-status-code.ts) : HTTP ステータス定数

### Task 2: `holomems` の基本 CRUD と Repository

- [ ] `holomems` の Repository を作る
- [ ] 一覧取得・新規追加・更新 API を作る
- [ ] `sort_order` と `is_active` の扱いを定義する
- [ ] `cards` 自動生成の準備を整える

### Task 3: `cards` と `board_nodes` の対応 API

- [ ] `cards` リストと更新 API を作る
- [ ] `board_nodes` リストと更新 API を作る
- [ ] `yellow_target` と `category` のバリデーションを決める

### Task 4: `holoworks` と候補ロジック

- [ ] ホロワーク枠 API と活動中メンバー API を作る
- [ ] 優先候補ロジックの雛形を作る
- [ ] 開始・完了・中断のフローを整理する

### Task 5: UI 画面と状態管理

- [ ] ログイン画面を作る
- [ ] 共通レイアウトとサイドメニューを作る
- [ ] `/home` と各管理画面へのルーティングを作る
- [ ] ローディングと保存メッセージ表示を整える

# 実装計画チェックリスト

## 現在の進捗サマリ

- 実装済み : JWT 認証、`/api/login`、`holomems` の CRUD API と Repository、LocalStorage による JWT 管理、ルートガード
- 次に着手するべき抽象タスク : `cards` / `board_nodes` / `holoworks` の API と UI、優先候補ロジック、最終 UX
- このファイルはタスク管理用である。実装ルールや命名規約は README / AGENTS.md を確認すること

## 基本方針

- README.md の機能要件と AGENTS.md のコーディングルールを守る
- 1タスクごとに小さく実装し、レビューしやすい粒度で進める
- Cloudflare D1 / Workers への本番反映は本作業対象外とし、ローカル検証とビルド確認を優先する

---

## Phase 1: プロジェクト基盤と共通定義

- [x] 既存のルート構成と命名規約を確認し、今後追加するファイルの配置方針を固定する
- [x] `shared/constants/` に HTTP ステータスと各種定数を整理する
- [x] `shared/helpers/` に汎用ヘルパーを整理し、既存の `isEmpty` などの命名と用途を統一する
- [x] `shared/types/` 配下に DB テーブルごとの型定義を作成する
- [x] `server/types/` 配下にサーバサイド専用の型を作成する
- [x] `server/repositories/` 配下に DB 操作クラスを追加する方針を定義する
- [x] `server/services/` にサーバロジックを切り出す構成を決める
- [x] アプリ全体で使うレスポンス形式を統一する（`result` / `error`）

---

## Phase 2: データモデルと DB 周りの実装

- [x] D1 SQLite の各テーブルに対応する型定義を作成する
  - [x] `holomems`
  - [x] `cards`
  - [x] `board_nodes`
  - [x] `holowork_achievements`
  - [x] `holoworks`
  - [x] `active_holowork_members`
  - [x] `memo`
- [ ] `holomems` 新規追加時に `cards` の星3・4・5レコードを自動生成するロジックを実装する
- [ ] `cards` の並び順・レア度・保有状況に対応するクエリを定義する
- [ ] `board_nodes` のカテゴリ制約 (`red|blue|yellow|green`) と `yellow_target` を反映する
- [ ] `holowork_achievements` の閾値計算ロジックを共通化する
- [ ] `holoworks` の削除制約（`active_holowork_members` がない場合のみ削除可能）を API で保証する
- [ ] `active_holowork_members` のユニーク制約は DB / API の両方で守るように設計する
- [ ] `memo` の単一レコード運用と保存/更新処理を実装する
- [x] 主要な Repository の実装を作成する
  - [x] `HolomemsRepository`
  - [x] `CardRepository`
  - [x] `BoardNodeRepository`
  - [x] `HoloworkAchievementRepository`
  - [x] `HoloworkRepository`
  - [x] `ActiveHoloworkMemberRepository`
  - [x] `MemoRepository`

---

## Phase 3: 認証と API ルーティング

- [x] `ADMIN_JWT_SECRET` を使った JWT 認証の仕組みを実装する
- [x] ログイン API `POST /api/login` を作成する
  - [x] 環境変数で渡されたパスワードと照合する
  - [x] JWT を発行し、Zustand の LocalStorage 永続化で保持する前提に合わせる
  - [x] 失敗時は適切な 401 / 400 を返す
- [x] API ルートの整理を行い、各リソースを `server/routes/api/...` に追加する
- [x] `GET /api/holomems` / `POST /api/holomems` / `PATCH /api/holomems/:id` を実装する
- [x] `GET /api/cards` / `POST /api/cards` / `PATCH /api/cards/:id` を実装する
- [x] `GET /api/board-nodes` / `POST /api/board-nodes` / `PATCH /api/board-nodes/:id` を実装する
- [x] `GET /api/holowork-achievements` / `PATCH /api/holowork-achievements/:id` を実装する
- [x] `GET /api/holoworks` / `POST /api/holoworks` / `DELETE /api/holoworks/:id` を実装する
- [x] `GET /api/active-holowork-members` / `POST /api/holoworks/:id/start` / `POST /api/holoworks/:id/complete` / `POST /api/holoworks/:id/abort` を実装する
- [ ] `GET /api/holoworks/:id/candidates?priority=...` を実装する
- [x] `GET /api/memo` / `PATCH /api/memo` を実装する

- API 実装時に守るルール:
  - 各 API では `context.req.json().catch(() => null)` で JSON を受け取り、`body == null` のときは 400 を返す
  - 正常レスポンスはトップレベルを `result` のみにし、失敗時はトップレベル `error` を使う
  - Zod で入力を検証し、`!parsed.success` のときは `mergeIssues(parsed.error)` を返す
  - `auth` が必要な API は `jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next)` の形で守る
  - `null` を許容する値は `string | null | undefined` とし、0 / 1 の真偽値は `z.union([z.literal(0), z.literal(1)])` を使う

---

## Phase 4: フロントエンド基盤と画面遷移

- [x] React Router v7 の画面構成と route の基本構造を整理する
- [x] JWT の有無でログイン状態を判定し、リダイレクトの基盤を作る
- [x] `client/stores/` の認証状態と LocalStorage 永続化の基盤を作る
- [x] `client/helpers/` に API 呼び出しラッパーを作成する
- [ ] トップページのログイン画面を作る
- [ ] 共通レイアウトとサイドメニューを作る
- [ ] `/home` のメインメニューを作成する
- [ ] `memo` の自動保存と保存メッセージ表示を実装する
- [ ] 最終保存日時を表示する
- [ ] 画面ごとのルーティングと画面遷移を整える

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
  - [ ] `holowork_achievements.current_count` を編集可能にする
  - [ ] `holowork_achievements.note` を編集可能にする
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

- 各タスク作業時に守るルール:
  - `npm run lint` を実行し、改善が必要ならその場で修正する
  - `npm run build` を実行し、型エラー・ビルドエラーが残らないようにする
  - 主要 API のエンドポイントは手動確認を行う
  - ログインフローの挙動を確認する
  - ホロワーク開始・完了・中断の操作フローを確認する
  - 最終的なコードの整理と命名の統一を行う
  - README と実装差分が合っているか最終確認する

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

- [x] 既存の Hono ルート構造を確認し、認証用の API ルートを追加する
  - [x] [server/routes/api/api.ts](server/routes/api/api.ts) に認証ルートを組み込む
  - [x] [server/routes/api/login/login.ts](server/routes/api/login/login.ts) を新規作成する
- [x] サーバー共通のレスポンス形式を固定する
  - [x] 200 系成功時は `{ result: ... }` を返す
  - [x] 失敗時は `{ error: ... }` を返す
  - [x] 例外時の共通ハンドリングを整える
- [x] JWT 認証の基盤を作る
  - [x] `ADMIN_JWT_SECRET` を利用する
  - [x] `hono/jwt` を使って JWT を検証する
  - [x] 認証失敗時の 401 レスポンスを定義する
- [x] `POST /api/login` の入力・出力を定義する
  - [x] 入力: `{ password: string }`
  - [x] 成功: JWT 発行
  - [x] 失敗: 400 / 401
- [x] ルートガードを作る準備を行う
  - [x] ログイン済み判定の共通ヘルパーを用意する
  - [x] 次のタスクでホロメン API などに適用できる形にする
- [x] 既存のサンプル実装を整理し、Task 1 で扱う API 以外のサンプルを分離する
  - [x] [server/routes/api/example/example.ts](server/routes/api/example/example.ts) は参考用途に限定する

### 実装時のファイル候補

- [server/routes/api/login/login.ts](server/routes/api/login/login.ts) : ログイン API
- [server/helpers/hash-password.ts](server/helpers/hash-password.ts) : パスワード比較用のヘルパー
- [server/types/hono-bindings.ts](server/types/hono-bindings.ts) : 環境変数の型を整備
- [shared/constants/http-status-code.ts](shared/constants/http-status-code.ts) : HTTP ステータス定数

### Task 2: `holomems` の基本 CRUD と Repository

- [x] `holomems` の Repository を作る
- [x] 一覧取得・新規追加・更新 API を作る
- [x] `sort_order` と `is_active` の扱いを定義する
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

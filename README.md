# Holodori Manager

スマホゲーム「ホロドリ (hololive Dreams)」における育成状況・ホロワークの管理を省力化する、個人利用向け Web アプリ。


## 技術スタック

- フロントエンド : React + React Router v7 (SPA モード)
- バックエンド : Hono (TypeScript)
- 実行環境 : Cloudflare Workers
- DB : Cloudflare D1 (SQLite)
- 認証 : 環境変数に注入したパスワードと照合し JWT を発行する (LocalStorage 保持とする)。単一ユーザ専用アプリのためユーザテーブルは持たない

実装に際しては本 `README.md` に記載の設計仕様の他、`AGENTS.md` (作業手順と注意事項) および `TASKS.md` (具体的な実装タスク) も参照すること。


## 開発用コマンド

- npm コマンド

```bash
# 初期インストール (環境構築時に1回のみ実行する)
$ npm install

# 開発サーバを起動する
$ npm run dev
# Lint
$ npm run lint
# ビルド
$ npm run build
# ビルドした後にプレビューサーバを起動する
$ npm run preview

# ビルドした後に Cloudflare Workers にデプロイする (開発者が手動でのみ行う・AI は実行禁止)
$ npm run deploy
```

- D1 データベース操作 (開発者が手動でのみ行う・AI は実行禁止)

```bash
# D1 データベースを作成する (最初に1回のみ実行する)
$ wrangler d1 create holodori-manager

# テーブルを確認するコマンド例
$ wrangler d1 execute holodori-manager --local  --command='SELECT * FROM 【テーブル名】'
$ wrangler d1 execute holodori-manager --remote --command='SELECT * FROM 【テーブル名】'
# SQL ファイルを実行する場合のコマンド例
$ wrangler d1 execute holodori-manager --local  --file='./schema.sql'
$ wrangler d1 execute holodori-manager --remote --file='./schema.sql'

# 各種マイグレーション用コマンド
$ wrangler d1 execute holodori-manager --local  --file='./migrations/create-tables.sql'
$ wrangler d1 execute holodori-manager --local  --file='./migrations/insert-initial-data.sql'
$ wrangler d1 execute holodori-manager --local  --file='./migrations/drop-tables.sql'
$ wrangler d1 execute holodori-manager --remote --file='./migrations/create-tables.sql'
$ wrangler d1 execute holodori-manager --remote --file='./migrations/insert-initial-data.sql'
$ wrangler d1 execute holodori-manager --remote --file='./migrations/drop-tables.sql'

# テーブル一覧を確認する
$ wrangler d1 execute holodori-manager --local  --command='SELECT * FROM sqlite_master WHERE type = '\''table'\'''
$ wrangler d1 execute holodori-manager --remote --command='SELECT * FROM sqlite_master WHERE type = '\''table'\'''
# インデックスを確認する
$ wrangler d1 execute holodori-manager --local  --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
$ wrangler d1 execute holodori-manager --remote --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
```

- シークレット管理
    - ローカル開発時は `.dev.vars` ファイルが自動的に参照される (Git 管理対象外)
    - `server/types/hono-bindings.ts` で型定義に含めておく

```bash
# 本番環境にシークレットを登録するコマンド例 (開発者が手動でのみ行う・AI は実行禁止)
$ echo 'VALUE' | wrangler secret put ADMIN_PASSWORD   --name holodori-manager
$ echo 'VALUE' | wrangler secret put ADMIN_JWT_SECRET --name holodori-manager
```


## ゲーム用語・仕様

| ゲーム内正式名称 | 説明                                                                                                                     |
|------------------|--------------------------------------------------------------------------------------------------------------------------|
| ホロメン         | キャラクターのこと。1人が複数のメンバーカードを持つ                                                                      |
| メンバーカード   | レア度 (星3・4・5、イベントで種類が増加) ごとに存在する                                                                  |
| ホロワーク       | 一定時間の放置で報酬アイテムが手に入るミニゲーム                                                                         |
| ホロメンボード   | マスを解放して報酬アップなどの効果を得る育成要素                                                                         |
| コネクトマス     | 隣接マスの効果を増幅させる機能                                                                                           |
| スコア           | ホロメン1人、およびユニット (5人構成) 全体での強さ指標。本アプリでは直接管理しないが将来のスコア戦略機能で扱う可能性あり |

### ホロメンボードのマス種別

| カテゴリ | 用途                                                             | 管理方針                                                   |
|----------|------------------------------------------------------------------|------------------------------------------------------------|
| `red`    | 音ゲー・リーダー用途                                             | 詳細管理せず、ホロメンごとの「自由記入欄」で運用する       |
| `blue`   | 音ゲー・メンバー用途                                             | 詳細管理せず、ホロメンごとの「自由記入欄」で運用する       |
| `yellow` | ホロワーク報酬アップ (キューブ4色、特訓アイテム3色、レッスン Pt) | 数値管理し、ホロワークでの採用優先度算出ロジックに使用する |
| `green`  | ミニゲーム報酬アップ (現状は全ホロメン共通6マス、基本 5% アップ) | 数値管理 (黄マスと同じ構造で管理する)                      |

### ホロワークの挙動

- 現状4枠 (将来増枠の可能性あり)。枠には「歌配信」「ゲーム配信」「雑談配信」「収録」といった名前がある
- 1枠につき1人以上、最大5人のホロメンを選んで「開始」する
- すでに活動中のホロメンは他の枠に同時採用できない (重複不可)
- 「完了」と「中断」は別の操作となる
    - **完了** : 5人を解放し、各ホロメンの「ホロワーク完了回数」をインクリメントする
    - **中断** : 5人を解放するのみ。カウントは増えない

### ホロワーク完了回数のアチーブメント閾値

- 閾値 : 1、5、10、30、50、100、200、300、400 回 (全ホロメン共通)


## DB スキーマ (Cloudflare D1 SQLite)

DDL は [create-tables.sql](./migrations/create-tables.sql) に記載している。

### `holomems` : ホロメン

- 新規ホロメン追加時、`cards` に星3・4・5の3レコードを `is_owned = 0` で自動生成する。また、`holowork_achievements` にも初期レコードを追加しておく
- `sort_order` は UNIQUE 相当で扱いたいが、フロントエンドから表示順の入れ替えを行いたい場合の操作性を考慮して、DB に UNIQUE 制約は付けないでおく
    - 表示においては、同値のレコードがある場合はその中で `id` 順に表示するようにしている
    - NOTE : 現状、「全体の再採番」や「整合性管理」などのロジックは設けていない
- `sort_order` の DEFAULT 値は 0 としているが、アプリ側のバリデーションで 1 以上でないと入力できないようにしてある
    - 表示においては「0 のレコードは除外する」といった絞り込みもしていないので、DB 直操作などで万が一「アプリ仕様上不正なデータ」が登録されていても、0 から順に表示されることになる

### `cards` : カード

- 一覧ページでのデフォルトソート : `holomems.sort_order ASC` → `holomems.id ASC` (念のため) → `rarity DESC` → `id ASC` (同レア度内では登録順 = 通常版が先、イベント限定版が後になる想定)

### `board_nodes` : ホロメンボードのマス

- `amount` と `connect_rate` を計算した結果の列は持たず、アプリ側で `amount × (1 + connect_rate / 100)` (`connect_rate` が Null なら `amount` そのまま) として算出・表示する
- 一覧ページでのデフォルトソート : `category` を `yellow`・`green`・`red`・`blue` の順 → `id ASC`

### `holowork_achievements` : ホロワーク達成状況

- 「活動中か否か」は `active_holowork_members` の有無で判定するため、本テーブルに `is_active` といったカラムは持たせない
- 次のアチーブ閾値・残り回数はアプリ側で算出する

### `holoworks` : ホロワークの枠

- 編集機能は不要。追加・物理削除は可能とする
- 削除時は `active_holowork_members` に紐付くレコードが存在しないことを API 側で確認する

### `active_holowork_members` : ホロワーク活動中のホロメン

- 登録と物理削除で活動中のホロメンを表現する

### `memo` : 自由メモ

- 現状は単一レコード運用を想定している


## ページ一覧

### トップページ (`/`)

- 未ログイン時 : パスワード欄 + Login ボタンのみ。環境変数のパスワードと照合し JWT を発行する (LocalStorage 管理で良い)
    - JWT が無効と判断された場合はコチラにリダイレクトし、「再度ログインしてください」のメッセージを表示する
- ログイン済 : メインページへリダイレクトする

### メインページ (`/home`)

- 各管理ページへのメニュー : 「ホロワーク管理」「ホロメン管理」「カード管理」「ホロメンボード管理」
- 以降の全ページでサイドメニューを表示する (スマホはハンバーガーメニューで開閉する)
- サイドメニュー内に `memo` を常時編集可能な形で配置し、Blur 時に自動保存する
    - 保存成功時に「保存しました」のメッセージを一定秒数表示し、その後非表示にする
    - 最終保存日時を表示する

### ホロメン管理 (`/holomems`)

- `holomems` の一覧表示・編集
- 卒業等に伴う `is_active` の切り替え、`note` 編集、新規ホロメン追加を可能とする
- デフォルト表示順は `sort_order` に従う

### カード管理 (`/cards`)

- `cards` の一覧表示・編集
- `is_owned` のチェックボックスで所有有無を管理する
- ソート : `holomems.sort_order` 順 → `rarity DESC` → `id ASC`

### ホロメンボード管理 (`/board-nodes`)

- `board_nodes` の一覧表示・編集 (`category` ごとにグルーピングし `id ASC` 順)
- `holomems.note` もこのページから表示・編集可能にする (赤・青マスの育成方針メモ用)

### ホロワーク管理 (`/holoworks`)

- `holoworks` ごとに `active_holowork_members` を表示し、「開始」「完了」「中断」操作を提供する
- 開始時に「完了回数重視」「キューブ獲得量重視」「特訓アイテム獲得量重視」「レッスン Pt 獲得量重視」(将来的に「S ランク重視」も追加予定) のいずれかを選び、その方針に沿った優先ホロメン候補を上位表示する
    - この選択自体は DB に永続化しない (選択ロジックのみに使用する)
    - 他枠で活動中のホロメンは候補として取得せず一覧には非活性表示 or 非表示にする (TODO : どちらが UI 的に良いかは要検討)
    - 「完了回数重視」を選択時は、各ホロメンの「現在のホロワーク完了回数」とアチーブメント閾値を比較し、より少ない回数でアチーブメント閾値に到達できるホロメンを上位表示する
- 下部にホロメン一覧を表示し、`holowork_achievements` (現在回数・次の閾値・残り回数)、`board_nodes` の黄マス情報、`cards` から分かる所有・レベル状況を確認できるようにする
- ホロワーク完了時のインクリメントはアプリ側で自動的に処理されるが、ゲームと同期してアプリの更新作業ができなかった時のために、ホロメン一覧では「ホロワーク完了回数」を手修正可能にする


## API 一覧 (`/api` 配下、RESTful)

| リソース             | エンドポイント一覧                                                                                                                       |
|----------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| 認証                 | `POST /api/login`                                                                                                                        |
| ホロメン             | `GET・POST /api/holomems`・`PATCH /api/holomems/:id`                                                                                     |
| カード               | `GET・POST /api/cards`・`PATCH /api/cards/:id`                                                                                           |
| ホロメンボードノード | `GET・POST /api/board-nodes`・`PATCH /api/board-nodes/:id`                                                                               |
| ホロワーク達成状況   | `GET /api/holowork-achievements`・`PATCH /api/holowork-achievements/:id`                                                                 |
| ホロワーク枠         | `GET・POST /api/holoworks`・`DELETE /api/holoworks/:id` (`active_holowork_members` が空の場合のみ許可する)                               |
| 活動中メンバー       | `GET /api/active-holowork-members`・`POST /api/holoworks/:id/start`・`POST /api/holoworks/:id/complete`・`POST /api/holoworks/:id/abort` |
| 優先候補算出         | `GET /api/holoworks/:id/candidates?priority=count\|lesson_pt\|cube\|training`                                                            |
| メモ                 | `GET・PATCH /api/memo`                                                                                                                   |


## 将来的な構想 (現段階ではスコープ外)

- ホロワーク1枠での「S ランク」判定・推奨編成ロジックを実装したい (カードの `rarity`・`level`・`bloom` を用いたスコア算出と思われるが現時点では厳密な計算式が不明なため実装未定)


## Notes

- ESLint v9 → v10、React Router v7 → v8、TypeScript v6 → v7 はそれぞれ紐付く別パッケージとの整合性が保てないためアップデートせず放置しておく


## Links

- [Neo's World](https://neos21.net/)

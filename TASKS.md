# 実装計画チェックリスト

**実行ルール : このファイルの未完チェックリストは上から順に実行すること。AI はファイル内で最初に出現する `- [ ]` (未完了のチェックリスト項目) を次タスクとして扱い、ユーザ確認なしに別タスクへ移行しない。**

このファイルはプロジェクトの実装フェーズとチェックリストを上から順に実行できるように整理したものです。

実装ルールは [AGENTS.md](AGENTS.md) に集約しています。詳細は AGENTS.md を参照してください。

- 目的 : フェーズ順に実装を進め、各タスクの対象ファイルや小さな実装単位が一目で分かるようにする
- 方針 : 各フェーズは上から順に完了させる。フェーズ内で完了した項目には `[x]` を付ける
- このファイルはフェーズ順で進めることを前提に整理している。対象ファイルなどの補足情報は必要に応じて各フェーズの中に追記すること


## 現状サマリ

- サーバ側の主要 API (認証、holomems, cards, board-nodes, holowork-achievements, holoworks, active-holowork-members, candidates, memo) はバックエンド実装済み
- フロントエンドの画面・UX は未完成 (一覧画面、編集画面、ホロワーク管理 UI 等)


## フェーズ構成 (上から順に実装していくこと)

### Phase 1 : プロジェクト基盤と共通定義

- 狙い : 型・定数・ヘルパー・ディレクトリ構造など土台を固める
- チェックリスト :
  - [x] ルート構成と命名規約の確認
  - [x] `shared/constants/` に HTTP ステータスなど基本定数を整理
  - [x] `shared/helpers/` に汎用ヘルパーを整理 (`isEmpty` 等)
  - [x] `shared/types/` に DB テーブル型を作成 (holomems, cards, board_nodes, holowork_achievements, holoworks, active_holowork_members, memo)
  - [x] `server/types/` にサーバ専用型を作成
  - [x] `server/repositories/` / `server/services/` 構成方針を決定
  - [x] API レスポンス形式を `result` / `error` で統一

### Phase 2 : データモデルと DB 操作

- 狙い : Repository 実装と DB 周りのクエリを固める
- チェックリスト :
  - [x] 主要 Repository 実装 (Holomems, Cards, BoardNodes, HoloworkAchievements, Holoworks, ActiveHoloworkMembers, Memo)
  - [x] `holomems` 作成時に `cards` を自動生成するロジック
  - [ ] `cards` の高度なクエリ (並び順・レア度・保有)
  - [ ] `board_nodes` のカテゴリ / `yellow_target` バリデーションの強化
  - [ ] `holowork_achievements` の閾値計算の共通化 (現在はサービス内に留める)
  - [ ] DB 側の削除制約 / 一意制約の追加検討

### Phase 3 : 認証と API ルーティング

- 狙い : 認証基盤と主要 API のルートを整備
- チェックリスト :
  - [x] `ADMIN_JWT_SECRET` を用いた JWT 認証実装
  - [x] `POST /api/login` 実装 (`server/routes/api/login/login.ts`)
  - [x] 主要リソースの API ルートを配置 (`server/routes/api/...`)
  - [x] `GET/POST/PATCH` 系の多くのエンドポイントは実装済 (holomems, cards, board-nodes, holoworks 等)
  - [x] `GET /api/holoworks/:id/candidates?priority=...` 実装済 (`server/services/holowork-candidates-service.ts`)

### Phase 4 : フロントエンド基盤と画面遷移

- 狙い : フロントのルーティングと基本 UI を作る
- チェックリスト :
  - [x] React Router v7 の構成 (`client/root.tsx`, `client/routes.ts`)
  - [x] 認証状態管理と LocalStorage 永続化 (`client/stores/`)
  - [x] API 呼び出しラッパー (`client/helpers/`)
  - [ ] トップページのログイン画面
  - [ ] 共通レイアウトとサイドメニュー
  - [ ] `/home` メニューとナビゲーション

### Phase 5 : 管理画面 (各リソース)

- 狙い : ホロメン / カード / ボードノード / ホロワークの CRUD UI
- チェックリスト :
  - [ ] `/holomems` 一覧・編集 (`sort_order`, `is_active`, note)
  - [ ] `/cards` 一覧・編集 (所持フラグ、レベル、開花)
  - [ ] `/board-nodes` 一覧・編集 (カテゴリ別表示、編集)
  - [ ] `/holoworks` 管理ページ (開始/完了/中断、候補表示、優先度選択)

### Phase 6 : 優先候補ロジックと UI

- 狙い : 優先度に応じた候補抽出ロジックとフロント表示
- チェックリスト :
  - [x] 優先度モード定義 (`count`, `lesson_pt`, `cube`, `training`)
  - [x] サーバ側で優先度別 SQL を分離して実装 (`getCountCandidates`, `getRateCandidates`)
  - [x] 活動中メンバーの除外ロジックを実装
  - [x] API のレスポンス形を固定 (selected_priority + candidates)
  - [ ] フロントでの候補表示 (並び順、非活性表示) の実装

### Phase 7 : 仕上げと検証

- 狙い : 動作確認、ビルド、ドキュメント整備
- チェックリスト :
  - [ ] この Phase で改めて `npm run lint` と `npm run build` を通す (CI 前提の手順)
  - [ ] 主要 API を手動で確認 (エンドツーエンドの挙動)
  - [ ] フロントの主要画面で UX を検証、修正
  - [ ] README と実装差分を照合

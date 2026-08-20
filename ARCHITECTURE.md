# Architecture

本プロジェクトの現行実装におけるシステム構成、依存方向、各レイヤーの責務を示す。


## システム構成

```text
Browser
  └ React SPA
     └ `/api` への HTTP リクエスト
        └ Cloudflare Workers + Hono
           └ Cloudflare D1 (SQLite)
```

- React Router を SPA モードで利用し、画面遷移とログイン後の共通レイアウトを構成する
- Hono の `/api` 配下に認証・各リソースのルートを登録する
- Cloudflare Workers の Binding から D1 と認証用環境変数を参照する
- 単一ユーザ専用のためユーザテーブルは持たず、環境変数のパスワードで JWT を発行する


## ディレクトリの責務

| ディレクトリ           | 責務                                                                             |
|------------------------|----------------------------------------------------------------------------------|
| `client/`              | React のページ、レイアウト、クライアント State、API 呼び出し、表示用ヘルパー     |
| `server/routes/`       | HTTP 入出力、認証、パラメータ・リクエスト検証、レスポンスへの変換                |
| `server/repositories/` | D1 の単一テーブルに対する CRUD                                                   |
| `server/services/`     | 複数テーブルを横断する Read Model と、複数 Repository を組み合わせるユースケース |
| `server/types/`        | JOIN 直後の SQL 行など、サーバ内部だけで使う型                                   |
| `shared/constants/`    | client・server で共有する定数とゲーム上の上限・下限                              |
| `shared/helpers/`      | 業務知識を持たない共有処理                                                       |
| `shared/schemas/`      | API と画面で共有する Zod Schema                                                  |
| `shared/services/`     | client・server の両方から利用するゲーム固有の計算規則                            |
| `shared/types/`        | Entity、画面・API 用の合成型、ゲーム固有型、汎用型                               |


## 依存方向

```text
client ┐
       ├─> shared
server ┘

server/routes   -> server/repositories (単一テーブルの単純な CRUD)
server/routes   -> server/services     (複合 Read Model・ユースケース)
server/services -> server/repositories または D1
server/services -> shared/services
```

- `shared/` は `client/`・`server/` に依存しない
- Route は HTTP の責務に限定し、DB クエリやゲーム計算を直接持たない
- Repository は単一テーブルの永続化を抽象化し、画面都合の複合 `JOIN` を持たない
- 複数テーブルを横断した画面・候補選定用 Read Model は、用途名を持つ Service が D1 から直接構築する

Repository と Service の境界を選んだ理由は [ADR-001](./docs/decisions/001-separate-table-crud-and-read-models.md) を参照のこと。


## レイヤーの境界

`shared/` には `client/`・`server/` 間で共有する契約と処理を置き、サーバ内部だけで扱う DB 取得直後の表現は `server/` に閉じる。複合 Read Model は Service が公開可能なモデルに変換してから Route に渡す。

型の分類と配置に関する実装ルールは [Shared Rules](./docs/agent-rules/shared.md)、サーバ各層の実装ルールは [Backend Rules](./docs/agent-rules/backend.md) を参照のこと。


## Read Model とゲーム計算

画面や候補選定に必要な複合 Read Model は、用途別の Service が構築する。ゲーム固有の計算規則は `shared/services/` に集約し、クライアント表示とサーバ処理で共通利用する。

この構成を選んだ理由は [ADR-001](./docs/decisions/001-separate-table-crud-and-read-models.md) と [ADR-002](./docs/decisions/002-centralize-game-calculations.md)、ゲーム上の計算規則は [Domain](./docs/domain.md) を参照のこと。


## 横断的な設計

- 整合性はサーバ側で保証し、不可分な複数書き込みは一つのユースケースとして扱う
- 認証は単一ユーザ向け JWT 認証とし、クライアントの認証状態は永続化する

API の契約は [API](./docs/api.md)、各領域の具体的な実装規則は [Agent Rules](./docs/agent-rules/README.md) を参照のこと。

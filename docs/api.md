# API

Hono で提供する `/api` 配下の API 契約を示す。各項目の厳密な型とバリデーションは、対応する `shared/types/` と `shared/schemas/` を正とする。


## 共通仕様

- `POST /api/login` を除き、JWT 認証を必要とする
- 正常レスポンスはトップレベルを `result` のみとする
- エラーレスポンスはトップレベルを `error` のみとする
- JSON Body は構文不正と Schema 不正を区別せず、クライアント入力エラーとして 400 を返す
- URL の ID は整数へ変換できない場合に 400 を返す
- 想定される Service エラーは `Result` 型で表し、Route が 400 または 404 に変換する

```json
{ "result": {} }
```

```json
{ "error": "エラーメッセージ" }
```


## API エンドポイント一覧

| リソース           | メソッド | パス                                                                  | 用途                                             |
|--------------------|----------|-----------------------------------------------------------------------|--------------------------------------------------|
| 認証               | `POST`   | `/api/login`                                                          | パスワードを照合して JWT を発行する              |
| ホロメン           | `GET`    | `/api/holomems`                                                       | 一覧を取得する                                   |
| ホロメン           | `POST`   | `/api/holomems`                                                       | 追加する                                         |
| ホロメン           | `PATCH`  | `/api/holomems/:id`                                                   | 更新する                                         |
| カード             | `GET`    | `/api/cards`                                                          | 一覧を取得する                                   |
| カード             | `POST`   | `/api/cards`                                                          | 追加する                                         |
| カード             | `PATCH`  | `/api/cards/:id`                                                      | 更新する                                         |
| ボードノード       | `GET`    | `/api/board-nodes`                                                    | 一覧を取得する                                   |
| ボードノード       | `POST`   | `/api/board-nodes`                                                    | 追加する                                         |
| ボードノード       | `PATCH`  | `/api/board-nodes/:id`                                                | 更新する                                         |
| ボードノード       | `DELETE` | `/api/board-nodes/:id`                                                | 削除する                                         |
| ホロワーク達成状況 | `PATCH`  | `/api/holowork-achievements/:id`                                      | 更新する                                         |
| ホロワーク枠       | `GET`    | `/api/holoworks`                                                      | 活動中メンバーを含む枠一覧を取得する             |
| ホロワーク枠       | `POST`   | `/api/holoworks`                                                      | ホロワーク枠を追加する                           |
| ホロワーク枠       | `DELETE` | `/api/holoworks/:id`                                                  | 活動中メンバーがいない枠を削除する               |
| ホロワーク状況     | `GET`    | `/api/holoworks/member-statuses`                                      | 有効なホロメンの達成・活動・黄マス集計を取得する |
| ホロワーク候補     | `GET`    | `/api/holoworks/candidates?priority=count\|cube\|training\|lesson_pt` | 優先候補とその他候補を取得する                   |
| ホロワーク操作     | `POST`   | `/api/holoworks/:id/start`                                            | 対象枠で活動を開始する                           |
| ホロワーク操作     | `POST`   | `/api/holoworks/:id/complete`                                         | 完了回数を加算して対象枠を完了する               |
| ホロワーク操作     | `POST`   | `/api/holoworks/:id/abort`                                            | 回数を加算せず対象枠を中断する                   |
| メモ               | `GET`    | `/api/memo`                                                           | メモを取得する                                   |
| メモ               | `PATCH`  | `/api/memo`                                                           | メモを追加または更新する                         |

Hono のルート定義では、`member-statuses` と `candidates` の固定パスを `/:id` を含むルートより前に置く。


## ホロワーク候補

`priority` は次のいずれかとする。

- `count` : 完了回数重視
- `cube` : キューブ獲得量重視
- `training` : 特訓アイテム獲得量重視
- `lesson_pt` : レッスン Pt 獲得量重視

レスポンスは、選択した優先条件を満たす候補と、満たさないが選択可能な候補を排他的に返す。

```ts
type HoloworkCandidates = {
  selected_priority  : CandidatePriority;
  priority_candidates: Array<HoloworkCandidate>;
  other_candidates   : Array<HoloworkCandidate>;
};
```

両配列に同じ `holomems_id` は含めない。候補選定の詳細は [features/holoworks.md](./features/holoworks.md) を参照のこと。


## ホロワーク開始

```ts
type StartHoloworkRequest = {
  holomems_ids: Array<number>;
};
```

`holomems_ids` は次を満たす必要がある。

- 1件以上5件以下
- すべて正の整数
- ID に重複がない

対象枠は URL の `:id` で指定し、Body に `holoworks_id` を重複して含めない。Schema 検証後も、存在する有効なホロメンであること、対象枠と他枠で活動中でないことを Service で再検証する。

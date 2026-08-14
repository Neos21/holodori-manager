# ホロワーク管理画面 改修設計

## 1. 目的

`client/pages/holoworks/holoworks.tsx` を、`holomems.tsx`・`cards.tsx`・`board-nodes.tsx` と同じデザイン・UI・実装パターンに揃えながら、以下を一画面で管理できるようにする。

- ホロワーク枠と活動中メンバーの確認
- ホロワーク枠の追加・削除
- ホロワークの開始・完了・中断
- ホロメンごとのホロワーク達成状況と黄マス効果の確認
- ホロワーク達成状況の手動編集
- 優先モードに基づく開始メンバーの選定

本書では実装方針のみを定義する。実装は `AGENTS.md` に従ってレビュー可能な単位に分割し、1タスクずつ開始確認を取って進める。


## 2. 確定仕様

### 2.1 一覧の対象

- ホロワーク達成状況一覧には `holomems.is_active = 1` のホロメンだけを表示する。
- 卒業済みホロメンは達成状況一覧にも開始候補にも表示しない。
- 一覧の並び順は `holomems.sort_order ASC`、同値の場合は `holomems.id ASC` とする。

### 2.2 アチーブメント

- 次回アチーブメントは、`current_count` より大きい `holoworkAchievements` の最小値とする。
- `current_count >= 400` の場合は全アチーブメント達成済みとし、次回回数・残り回数を `null` とする。
- 全アチーブメント達成済みのホロメンは「完了回数重視」の優先候補に含めない。

### 2.3 黄マス効果

- `board_nodes.category = 'yellow'` かつ `board_nodes.is_unlocked = 1` のレコードだけを集計対象とする。
- 1レコードの最終レートは次式で算出する。

```text
amount * (1 + (connect_rate ?? 0) / 100)
```

- ホロメンごと・`yellow_target` ごとに最終レートを合算し、キューブ・特訓アイテム・レッスン Pt の3列に表示する。
- 対象レコードがないアイテムの合計値は `0` とする。

### 2.4 開始人数と候補区分

- 1枠につき1人以上5人以下を選択できる。
- 5人未満でも開始可能とするが、モーダル内で注意文を表示する。
- 候補は「優先候補」と「その他の選択可能なホロメン」の2セクションに分ける。
- 両セクションから合計5人まで任意選択できる。
- 優先候補に含まれたホロメンは、その他候補には含めない。
- 他枠で活動中のホロメンと卒業済みホロメンは、どちらのセクションにも含めない。


## 3. 初期画面の構成

画面は次の順に表示する。

1. ホロワーク枠一覧テーブル
2. ホロメン別ホロワーク達成状況・黄マス情報テーブル
3. 「ホロワークの枠追加」ボタン

ページ全体では他の一覧画面と同様に、次の表現を利用する。

- 一覧取得エラー: `alert alert-error alert-soft mb-4`
- 読込中: 中央寄せの `loading loading-spinner text-warning`
- テーブル: `table table-xs`
- 横幅を超えるテーブル: `overflow-x-auto`
- 主要操作: `btn btn-info`
- 通常操作: `btn btn-xs`
- 危険操作: `btn btn-error btn-xs`
- モーダル: DaisyUI の `modal modal-open`、`modal-box`、`modal-backdrop`

### 3.1 ホロワーク枠一覧テーブル

列は以下の固定構成とする。

| 列 | 表示・挙動 |
|---|---|
| 枠の名前 | `holoworks.name` |
| 活動中メンバー | 1人につき1つのブロック要素で、1セル内に改行表示 |
| 開始 | 対象枠に活動中メンバーがいない場合のみ活性 |
| 完了 | 対象枠に活動中メンバーがいる場合のみ活性 |
| 中断 | 対象枠に活動中メンバーがいる場合のみ活性 |
| 削除 | 対象枠に活動中メンバーがいない場合のみ活性 |

操作列はまとめず、各操作を独立した列として常時表示する。操作不可能な場合もボタン自体は表示し、`disabled` にする。これにより、枠ごとに可能な操作を同じ位置で比較できる。

各操作中は二重送信を防ぐ。画面全体のボタンを一律に無効化する方針とする。

### 3.2 ホロメン別達成状況・黄マス情報テーブル

列は次のとおりとする。

| 列 | データ |
|---|---|
| グループ | `holomems.group_name` |
| タレント名 | `holomems.name` |
| 現在のホロワーク完了回数 | `holowork_achievements.current_count` |
| 直近のアチーブメント回数 | 共有 Service で算出した `next_threshold` |
| 達成までの残り回数 | 共有 Service で算出した `remaining_count` |
| 達成状況メモ | `holowork_achievements.note` |
| 活動中 | `active_holowork_members` の存在有無 |
| キューブ獲得アップ量 | 解放済み黄マスの合計最終レート |
| 特訓アイテム獲得アップ量 | 解放済み黄マスの合計最終レート |
| レッスン Pt 獲得アップ量 | 解放済み黄マスの合計最終レート |

表示上の詳細は以下とする。

- `next_threshold == null` の場合は全達成のため `-` を表示する。
- `remaining_count == null` の場合は `-` を表示する。
- 活動中は、活動中なら `◯`、非活動中なら `-` を表示する。
- 合計最終レートは小数第2位まで固定表示する。
- 「現在のホロワーク完了回数」と「達成状況メモ」のセルは `cursor-pointer` とし、どちらをクリックしても同じ編集モーダルを開く。
- 横に長いテーブルになるため、列は `whitespace-nowrap` と幅指定を利用し、メモ列だけ一定の最小幅と折り返しを許可する。

### 3.3 「ホロワークの枠追加」ボタン

- 2つのテーブルより後、右寄せで配置する。
- クリック時に「新規ホロワーク枠追加」モーダルを開く。
- 「開始」操作とは別機能であり、このボタンは `INSERT INTO holoworks` に相当する。


## 4. モーダル設計

### 4.1 ホロワーク達成状況編集

`board-nodes.tsx` の「ホロメンメモ編集」モーダルと同じ構成にする。

- タイトル: 「ホロワーク達成状況編集」
- ホロメン: グループ名・タレント名を読取専用表示
- 現在のホロワーク完了回数: `number`、0以上の整数
- 達成状況メモ: `textarea`
- ボタン: 「キャンセル」「更新する」
- バリデーション: `holoworkAchievementSchema.pick({ current_count: true, note: true })`
- 更新 API: `PATCH /api/holowork-achievements/:id`

更新成功時は先にモーダルを閉じ、フォーム State をリセットしてから達成状況一覧を再取得する。失敗時はモーダルを維持し、フォーム内にエラーを表示する。

### 4.2 新規ホロワーク枠追加

- タイトル: 「新規ホロワーク枠追加」
- 入力: 枠の名前
- バリデーション: 既存の `holoworkSchema`
- 登録 API: `POST /api/holoworks`
- ボタン: 「キャンセル」「追加する」

追加成功時はモーダルを閉じて枠一覧を再取得する。

### 4.3 ホロワークを開始する

開始ボタン押下直後は次だけを表示する。

- 対象となるホロワーク枠名
- 優先モードのセレクトボックス
- キャンセルボタン

セレクトボックスの初期値は未選択とし、選択後に `GET /api/holoworks/candidates?priority=...` を呼び出す。取得中はモーダル内にローディング表示を出す。

候補取得後は次を追加表示する。

1. 選択人数 `n / 5`
2. 5人未満でも開始できるが、通常は5人選択する旨の注意文
3. 優先候補テーブル
4. その他の選択可能なホロメンテーブル
5. 「開始する」ボタン

#### 優先候補テーブル

共通列として、選択チェックボックス・グループ・タレント名・達成状況メモを表示する。優先モードごとの比較値は以下とする。

| 優先モード | 比較情報 | 並び順 | 優先候補から除外する条件 |
|---|---|---|---|
| 完了回数重視 | 現在回数、次回回数、残り回数 | 残り回数 ASC、次回回数 ASC、表示順 ASC、ID ASC | `current_count >= 最大閾値` |
| キューブ獲得量重視 | キューブ合計最終レート | 合計 DESC、表示順 ASC、ID ASC | 合計が0以下 |
| 特訓アイテム獲得量重視 | 特訓アイテム合計最終レート | 合計 DESC、表示順 ASC、ID ASC | 合計が0以下 |
| レッスン Pt 獲得量重視 | レッスン Pt 合計最終レート | 合計 DESC、表示順 ASC、ID ASC | 合計が0以下 |

優先候補は上位5人に限定せず、条件を満たす全員を表示する。ユーザが比較したうえで任意の5人を選べるようにする。

#### その他の選択可能なホロメンテーブル

以下の差集合としてサーバ側で生成する。

```text
その他候補
= 有効なホロメン
- いずれかの枠で活動中のホロメン
- 選択中の優先モードにおける優先候補
```

これにより2セクション間の重複を構造的に防止する。フロントエンドで候補配列を結合・差し引きして区分を作らない。

その他候補にも優先モードに対応した比較情報を表示する。たとえば完了回数重視で全達成済みなら「全達成」、アイテム重視で対象効果がなければ `0.00` と表示する。並び順は通常のホロメン表示順とする。

チェックボックスは両テーブルで同じ `selectedHolomemsIds` を参照する。5人選択済みの場合、未選択行のチェックボックスだけを非活性にし、選択解除は可能なままにする。優先モード変更時は選択をリセットし、候補集合と比較値が切り替わった状態で改めて選択してもらう。


## 5. API 設計

### 5.1 エンドポイント一覧

| Method | Path | 用途 |
|---|---|---|
| `GET` | `/api/holoworks` | 枠一覧と活動中メンバーを取得 |
| `POST` | `/api/holoworks` | 枠を追加 |
| `DELETE` | `/api/holoworks/:id` | 活動中メンバーがいない枠を削除 |
| `GET` | `/api/holoworks/member-statuses` | 有効なホロメンの達成状況・活動状況・黄マス集計を取得 |
| `GET` | `/api/holoworks/candidates?priority=...` | 優先候補とその他候補を取得 |
| `POST` | `/api/holoworks/:id/start` | 対象枠で1～5人の活動を開始 |
| `POST` | `/api/holoworks/:id/complete` | 対象枠を完了し、活動メンバーの回数を加算して解放 |
| `POST` | `/api/holoworks/:id/abort` | 対象枠の活動メンバーを回数加算せず解放 |
| `PATCH` | `/api/holowork-achievements/:id` | 完了回数・達成状況メモを手動更新 |

`member-statuses` と `candidates` は固定パスのため、Hono では `/:id` 系ルートより前に定義する。これにより `member-statuses` や `candidates` が ID として解釈される可能性を避ける。

### 5.2 パス変更の考え方

現行の開始・完了・中断 API は `/api/active-holowork-members/:id/...` だが、`:id` が `active_holowork_members.id` ではなく `holoworks.id` を表している。操作対象とパス上のリソースが一致していないため、以下へ移動する。

```text
POST /api/holoworks/:id/start
POST /api/holoworks/:id/complete
POST /api/holoworks/:id/abort
```

候補取得は対象枠の ID を選定ロジックに使わないため、以下とする。

```text
GET /api/holoworks/candidates?priority=count|cube|training|lesson_pt
```

`GET /api/active-holowork-members` は改修後に未使用となるため削除する。開始・完了・中断ルートも `holoworks` へ移動するため、`server/routes/api/active-holowork-members/active-holowork-members.ts` と API ルータへの登録を削除する。`ActiveHoloworkMembersRepository` はホロワーク関連 Service から引き続き利用する。

### 5.3 候補取得レスポンス

候補レスポンスは次の形を基本とする。

```ts
type HoloworkCandidates = {
  selected_priority   : CandidatePriority;
  priority_candidates : Array<HoloworkCandidate>;
  other_candidates    : Array<HoloworkCandidate>;
};
```

`priority_candidates` は選択した優先モードの条件を満たす「優先すべきホロメン」、`other_candidates` はその条件を満たさない「その他の選択可能なホロメン」を表す。両方とも開始メンバー選択 UI に必要なため、候補 API は常に2配列を返す。

レスポンス型自体は優先モードごとに分割しない。既存の `HoloworkCandidate` Union を利用し、`selected_priority` に対応する候補情報を両配列へ格納する。`priority_candidates` と `other_candidates` はサーバ側で排他的に生成し、双方に同じ `holomems_id` が含まれないことを Service の責務とする。

ただし、候補算出時に全種類の情報を毎回集計することは避ける。Service は `priority` によって取得 SQL を切り替える。

- `count`: `holomems`・`holowork_achievements`・活動状況だけを取得し、`board_nodes` は JOIN しない。
- `cube`・`training`・`lesson_pt`: 選択された1種類の `yellow_target` に該当する解放済み黄マスだけを取得・集計する。他の2種類は取得しない。
- いずれの場合も同じ取得結果を条件で分け、優先条件を満たしたものを `priority_candidates`、満たさなかったものを `other_candidates` とする。その他候補を作るために別の全項目集計は行わない。

### 5.4 開始リクエスト

```ts
type StartHoloworkRequest = {
  holomems_ids: Array<number>;
};
```

共有 Zod Schema を新設し、以下を検証する。

- 配列であること
- 1件以上5件以下であること
- 全要素が正の整数であること
- 同じ ID が重複していないこと

Controller では他 API と同様に `await context.req.json().catch(() => null)` を使用し、構文不正と Schema 不正を400で返す。

対象のホロワーク枠は URL の `:id` で指定するため、リクエストボディに `holoworks_id` は含めない。URL とボディに同じ識別子を重複させず、Controller から Service へ `holoworkId` と `holomemsIds` を個別に渡す。


## 6. 型とデータ取得設計

### 6.1 画面用の型

`shared/types/holowork-member-status.ts` を新設し、初期画面の達成状況・黄マス情報テーブルで利用する。候補 API は必要項目が優先モードによって異なるため、既存の `HoloworkCandidate` Union を更新して利用する。

```ts
type HoloworkMemberStatus = {
  holomems_id                    : number;
  holomems_sort_order            : number;
  holomems_group_name            : string;
  holomems_name                  : string;
  holowork_achievements_id       : number;
  current_count                  : number;
  next_threshold                 : number | null;
  remaining_count                : number | null;
  achievement_note               : string | null | undefined;
  active_holoworks_id            : number | null;
  active_holoworks_name          : string | null;
  cube_total_rate                : number;
  training_total_rate            : number;
  lesson_pt_total_rate           : number;
};
```

枠一覧は、既存 `Holowork` に活動中メンバー配列を追加した画面用型を別途定義する。

```ts
type HoloworkDisplay = Holowork & {
  active_members: Array<{
    holomems_id        : number;
    holomems_sort_order: number;
    holomems_group_name: string;
    holomems_name      : string;
  }>;
};
```

### 6.2 一括取得

`HoloworkMemberStatusesService` に、ホロメンを起点として以下を `LEFT JOIN` する画面用 SQL を置く。

- `holowork_achievements`
- `active_holowork_members`
- `holoworks`
- 解放済み黄マスに限定した `board_nodes`

SQL はホロメン・黄マス単位の行を返す。`server/services/holowork-member-statuses-service.ts` の `HoloworkMemberStatusesService` が直接クエリを実行し、ホロメン単位にまとめ、共有 Service で進捗と3種類の合計最終レートを算出する。JOIN 結果だけに使用する内部型は `server/types/` に置く。

この構成には次の利点がある。

- DB 呼び出しは1回で済む。
- SQL にアチーブメント閾値の `CASE` 文を埋め込まない。
- SQL と TypeScript に同じ計算式を二重実装せずに済む。
- 初期一覧と候補取得が同じ共有 Service の計算規則を利用できる。
- 閾値や計算式を変更した時の修正箇所を限定できる。

黄マスを単純 JOIN すると同じホロメン情報が複数行返るため、Service では `Map<holomems_id, HoloworkMemberStatus>` を使って1人分へ集約する。SQL の `SUM` で計算を完結させる方式は採用しない。データ量が大規模になる画面ではなく、保守性と計算規則の一元化を優先する。

枠一覧についても `HoloworksService` がホロワーク枠・活動中メンバー・ホロメン情報を JOIN し、`active_members` 配列へまとめる。活動中メンバーは `holomems.sort_order ASC`、同値の場合は `holomems.id ASC` で並べる。これによりクライアント側の `holomemsById` と複数 API の突合を不要にする。

単一テーブルの CRUD は引き続き各 Repository に置く。一方、今回の SQL は特定テーブルの永続化を抽象化するものではなく、複数テーブルを横断した画面・候補選定用 Read Model を作るものである。そのため `HolomemsRepository` や `HoloworksRepository` に大きな JOIN を追加せず、用途を表す Service に配置する。


## 7. 計算ロジックの共通化

### 7.1 アチーブメント進捗

ゲーム固有のビジネスロジックとして `shared/services/holowork-achievements-service.ts` に `HoloworkAchievementsService` を作る。

```ts
type HoloworkAchievementProgress = {
  next_threshold : number | null;
  remaining_count: number | null;
};

class HoloworkAchievementsService {
  public static calcProgress(currentCount: number): HoloworkAchievementProgress { /* ... */ }
}
```

この Service だけが `holoworkAchievements` を参照し、現在回数から次回閾値と残り回数を算出する。既存 `HoloworkCandidatesService` の `buildNextThresholdCase()` と `buildRemainingCountCase()` は削除する。

### 7.2 黄マス最終レート

ゲーム固有のビジネスロジックとして `shared/services/board-nodes-service.ts` に `BoardNodesService` を作り、`board-nodes.tsx` 内の `calcFinalRate` を移動する。

```ts
class BoardNodesService {
  public static calcFinalRate(amount: number, connectRate: number | null): number {
    return amount * (1 + (connectRate ?? 0) / 100);
  }
}
```

以下で同じメソッドを使う。

- `board-nodes.tsx` の1マスごとの最終レート表示
- `HoloworkMemberStatusesService` のアイテム別合算
- `HoloworkCandidatesService` の選択されたアイテムに対する合算

### 7.3 表示フォーマット

小数第2位固定表示はビジネス計算ではないが、2画面で表記を揃えるため `shared/helpers/format-decimal.ts` へ切り出す。計算中は丸めず、全レコードを合算した後の表示時だけ `toFixed(2)` を適用する。

これにより、レコード単位で丸めてから合算する場合との誤差を防ぐ。


## 8. Service の責務

### 8.1 `HoloworkMemberStatusesService`

- 有効なホロメンだけを対象にする。
- 複数テーブルを JOIN した画面用 SQL を実行する。
- JOIN 結果をホロメン単位へ集約する。
- アチーブメント進捗を共有 Service で算出する。
- 解放済み黄マスだけをアイテム種別ごとに合算する。
- 一覧表示順に並べて返す。

### 8.2 `HoloworkCandidatesService`

SQL 内に計算式を直接持つ現在の実装を変更し、選択された優先モードに必要なデータだけを取得して共有 Service で計算する。初期一覧用の `HoloworkMemberStatusesService` の全項目取得結果は流用しない。

処理順は以下とする。

1. `priority` に応じた SQL で、有効かつ活動中でないホロメンと必要最小限の比較情報を取得する。
2. `count` ではアチーブメント情報だけ、アイテム重視では指定された1種類の解放済み黄マスだけを計算する。
3. 優先モードの条件を満たすものを `priority_candidates` として抽出する。
4. 優先モードに応じて並べ替える。
5. 同じ取得結果から優先候補 ID の `Set` を差し引き、`other_candidates` を作る。
6. 2配列をレスポンスとして返す。

優先候補とその他候補をサーバ側で分けるため、フロントエンドは選定ルールを持たず、表示と選択管理だけを担当する。

### 8.3 `HoloworksService`

ホロワーク枠の表示モデル作成と、開始・完了・中断のユースケースを扱う。

#### 開始

1. 対象の `holoworks.id` が存在することを確認する。
2. 対象枠に活動中メンバーがいないことを確認する。
3. リクエストされた全ホロメンが存在し、`is_active = 1` であることを確認する。
4. いずれのホロメンも他枠で活動中でないことを確認する。
5. 1～5件の INSERT を一括実行する。

DB の `active_holowork_members.holomems_id UNIQUE` も最終防衛線として利用する。事前確認後に競合が発生した場合も、部分登録を残さずユーザ向けエラーに変換する。

#### 完了

1. 対象の `holoworks.id` が存在することを確認する。
2. 対象枠の活動中メンバーを取得し、0人なら400を返す。
3. 各メンバーの `current_count` を1増やす。
4. 対象枠の `active_holowork_members` を削除する。

回数加算とメンバー解放は一体の操作として扱い、D1 の一括実行機構を用いて途中状態を残さない。達成状況レコードが欠けている場合は、既存方針どおり `current_count = 1` で作成できる UPSERT にする。

#### 中断

1. 対象の `holoworks.id` が存在することを確認する。
2. 対象枠の活動中メンバーを確認し、0人なら400を返す。
3. 対象枠の `active_holowork_members` だけを削除する。

#### 削除

削除直前にも活動中メンバーがいないことを API 側で検証する。可能であれば Repository の DELETE 自体を `NOT EXISTS` 条件付きにし、事前確認と削除の間に状態が変化しても活動中の枠を削除しないようにする。


## 9. クライアント側の State 方針

現在の `holoworks.tsx` に混在している一覧・追加フォーム・開始フォームの State を、用途別に明示する。

- 一覧: `holoworks`、`memberStatuses`、`isLoading`、`listError`
- 枠追加モーダル: `isCreateModalOpen`、`holoworkName`、`isCreating`、`createError`
- 達成状況編集モーダル: `isAchievementModalOpen`、`achievementTarget`、`achievementForm`、`isUpdatingAchievement`、`achievementError`
- 開始モーダル: `startingHolowork`、`priority`、`priorityCandidates`、`otherCandidates`、`selectedHolomemsIds`、`isLoadingCandidates`、`isStarting`、`startError`
- 枠アクション: `actionTarget` または同等の State、`actionError`

一覧取得エラーとモーダル内のフォームエラーを分離する。あるモーダルの失敗がページ上部の共通エラーとして残り続けないようにする。

イベントハンドラは `AGENTS.md` に従い、`onStartCreate`、`onOpenAchievementModal`、`onChangePriority`、`onSubmitStart` のように `on` 接頭辞を使用する。

### 9.1 SQL 行と画面モデルの型境界

`shared/types/` の型は API を介してクライアントにも公開する完成済みの画面モデル、`server/types/` の `*Row` は JOIN 直後かつ集約・計算前の SQL 1行を表す。

- ホロメン ID・表示順・グループ・名前など、意味と nullability が同じ項目は `HoloworkMember` などの共有型を合成して表す。
- `HoloworkDisplayRow` は LEFT JOIN 先がない場合にホロメン列が `null` となり、Service で `HoloworkDisplay.active_members` へ集約するため、画面モデルと同一型にはしない。
- 候補・メンバー状況の `*Row` は黄マス1件ごとに同じホロメンが重複し、進捗や合計最終レートも未計算である。Service が Map 等で集約・計算した後の型とは分離する。

この境界を崩して SQL 行を画面モデルとして扱うと、未計算値や JOIN 由来の `null` をクライアントへ誤って公開しやすいため、同じ意味の部分だけを再利用する。


## 10. 確認ダイアログと再読込

- 削除: `window.confirm('このホロワーク枠を削除しますか？')`
- 中断: 枠名と、中断では完了回数が増えない旨を含む確認文
- 完了: 枠名と、活動中メンバー全員の完了回数が1増える旨を含む確認文
- 開始: モーダルのフォーム送信で確定するため、追加の `window.confirm` は行わない。

操作成功後は、影響範囲に応じて一覧を再取得する。

- 枠追加・削除・開始・中断: 枠一覧とメンバー状況を再取得
- 完了: 枠一覧とメンバー状況を再取得
- 達成状況編集: メンバー状況を再取得

開始・完了・中断後は候補情報が古くなるため、開始モーダルを閉じて候補 State を破棄する。


## 11. エラー処理と競合対策

クライアントのボタン非活性は操作性のための制御であり、整合性保証は API 側で行う。

API では少なくとも以下を検証する。

- 存在しない枠への開始・完了・中断・削除
- 活動中メンバーがいる枠の再開始・削除
- 活動中メンバーがいない枠の完了・中断
- 存在しない、卒業済み、または既に活動中のホロメンを含む開始
- 0人、6人以上、重複 ID、整数でない ID を含む開始
- 不正な `priority`

候補取得から開始確定までに別操作が入る可能性があるため、開始 API は候補取得結果を信用せず、確定時に全条件を再検証する。


## 12. 既存実装からの主な変更点

- 枠追加フォームを常設表示からモーダルへ変更する。
- 開始フォームをページ内展開からモーダルへ変更する。
- 枠操作を1列から「開始」「完了」「中断」「削除」の4列へ分割する。
- 達成状況・黄マス集計テーブルを追加する。
- 達成状況編集モーダルを追加する。
- 初期表示時の3 API 呼び出しとクライアント側突合を、画面用レスポンスへ整理する。
- 候補 API から不要な `holoworks.id` を除く。
- 開始・完了・中断 API を `/api/holoworks/:id/...` に移動する。
- 未使用になる `GET /api/active-holowork-members` とルートファイルを削除する。
- `HoloworkCandidatesService` の SQL 内計算を共有 Service へ置き換える。
- 候補 SQL は優先モードごとに必要なテーブル・黄マス種別だけを取得する。
- 黄マス候補計算で `is_unlocked = 1` を必須にする。
- 候補の `holomems_note` という誤解を招く項目を廃止し、`holowork_achievements.note` を `achievement_note` として明示する。
- 開始・完了処理を部分成功しない構成に変更する。


## 13. 実装タスクの分割案

各項目を1回の実装・レビュー単位とする。各タスク完了時に `npm run lint && npm run build` を実行する。

1. 計算 Service と共有型の追加
   - アチーブメント進捗計算
   - 黄マス最終レート計算
   - 小数表示
   - `board-nodes.tsx` の既存計算を共有 Service へ置換
2. ホロメン別ステータス取得の実装
   - Service 内の画面用 JOIN
   - `HoloworkMemberStatusesService`
   - `GET /api/holoworks/member-statuses`
3. 候補取得の再設計
   - 優先モード別の必要最小限の SQL と共有 Service 利用
   - 優先候補・その他候補の排他的生成
   - `GET /api/holoworks/candidates`
4. ホロワーク操作 API の移動と整合性改善
   - 開始 Schema
   - `/api/holoworks/:id/start|complete|abort`
   - 複数書き込みの一括実行
   - 旧アクションルートの削除
   - 未使用になる活動中メンバー一覧ルートの削除
5. 枠一覧・達成状況一覧・枠追加モーダルの UI 実装
6. 達成状況編集モーダルの UI 実装
7. 開始候補モーダルの UI 実装
8. 完了・中断・削除の確認 UI と最終的な再読込制御
9. README の API 一覧・画面仕様を実装結果に合わせて更新

DB スキーマ変更や D1 マイグレーションは想定しない。Cloudflare D1 へのマイグレーションおよび本番デプロイは実行しない。


## 14. 検証観点

### 14.1 計算

- `current_count` が 0、1、4、5、399、400、401 の場合の次回閾値・残り回数
- `connect_rate` が `null`、0、正数の場合の最終レート
- 同一アイテムの黄マスが複数ある場合の合算
- 未解放黄マス、黄以外のマス、対象アイテムが異なる黄マスが混入しないこと
- 合算前に小数丸めが行われないこと

### 14.2 候補

- 優先候補とその他候補に同一 ID が存在しないこと
- 活動中・卒業済みホロメンが両方の候補から除外されること
- 全達成済みが完了回数優先候補から除外され、その他候補には表示されること
- 対象アイテム効果0のホロメンがアイテム優先候補から除外され、その他候補には表示されること
- 同順位時の並び順が安定していること

### 14.3 操作

- 空枠と活動中枠で4ボタンの活性状態が正しいこと
- 1人・5人で開始でき、0人・6人・重複 ID では開始できないこと
- 5人選択後も選択解除できること
- 完了時だけ回数が増え、中断時は増えないこと
- 完了処理の途中失敗時に「回数だけ増えた」「一部だけ解放された」という状態が残らないこと
- 活動中メンバーがいる枠を削除できないこと
- 候補表示後に状態が変わっても、開始 API が競合を検出すること

### 14.4 UI

- 横スクロール時にも各列が判読できること
- 活動中メンバーが1人1行で表示されること
- 完了回数セルとメモセルのどちらからも同じ編集モーダルが開くこと
- モーダルごとのエラーが別のモーダルや一覧に残らないこと
- 背景クリック・キャンセルでフォーム State が正しく破棄されること

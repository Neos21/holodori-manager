# AGENTS.md

**AI はまず [TASKS.md](TASKS.md) を読み、先頭に記載の「実行ルール」に従ってファイル内で最初の未完タスクのみを実行候補として扱う。実行前に必ずユーザに開始確認を取り、実行後は `npm run lint && npm run build` を実行して結果を報告する。**


## 実装の流れとして守るべきルール

- 1タスクごとに実装を行い開発者にレビューを求める
    - 開発者が全コードをレビューするので、各ステップでの変更量が大きくならないように事前にタスク分解し、1回の実行での実装量を増やしすぎないこと
- 実装完了時は `$ npm run lint` と `$ npm run build` を実行してエラーがない状態にする
    - 3回以上修正して Lint・ビルドを実行しても修正しきれないエラーが残る場合は処理を中止し、開発者に報告する
- レビュー指摘を受けた場合は以下の「コーディングルール」セクションに指摘内容を追記し、再発防止に努める
- 実行できないコマンド等が発生したら処理を中止し、開発者に報告する


## やってはいけないこと

- **Cloudflare D1 への DB マイグレーション、Cloudflare Workers への本番デプロイは開発者が手動で行うため、AI エージェントはいかなる場合も実行しないこと**


## コーディングルール

- ディレクトリ名、ファイル名、TypeScript のクラス名や変数名は単数形と複数形を正確に区別する
    - 例 : Controller・Service・Repository は複数概念を扱う命名として扱う
    - 例 : Type・Schema は単数概念として扱う
    - 例 : `holomems` は複数レコード集合、`holomem` は単一レコードを表す
- 共有ロジックはヘルパーに切り出す
    - Helper を作成する際は `@typescript-eslint/explicit-function-return-type` を考慮し、関数式や arrow 関数の戻り型を明示する
- DB テーブルの型定義は `shared/types/` 配下にテーブル別に作成する
- DB 操作部分は `server/repositories/` 配下にテーブル別の Repository として実装する
    - Repository の命名は複数形にする。例 : `holomems-repository.ts` / `class HolomemsRepository`。ファイル名とクラス名の単複は一致させる
    - Repository のメソッド名は `findAll` / `findById` / `create` / `update` のように、一覧取得・単体取得の命名を明確にする
- サーバサイドロジックは `server/services/` 配下に作成し、サーバサイドロジック内でのみ使う型定義は `server/types/` 配下に作成する
- ルーティングコントローラ
    - `context.req.json()` は常に `await context.req.json().catch(() => null)` で受け、`body == null` の場合は 400 エラーを返す
    - 正常レスポンスは必ずトップレベルを `result` のみとし、エラーはトップレベル `error` を使う
    - ルートパス文字列に `/:id` を含む場合、`comment-colon-spacing` ルールの影響を避けるため `// eslint-disable-line neos-eslint-plugin/comment-colon-spacing` を付ける
- 言語仕様全般
    - 正規表現は必ず `(/.../)` とカッコで囲む
    - **文字列の空文字・Null 判定にはヘルパー関数 `isEmpty()` を積極的に利用する**
    - 暗黙型変換を使った `if(!condition)` は避け、`== null` や `=== ''` のように明示比較する
- フロントエンド実装ルール
    - イベントハンドラは `onSubmit` / `onLoadFoo` / `onChangeBar` のように `on` を接頭辞にした関数名に統一し、`handleX` 系の命名は避ける
    - UX で発火する処理は `SubmitEvent` (`react` より Type インポート) を必ず使い、`FormEvent` は絶対に使用してはならない (非推奨のため)
    - `ky` の `json<T>()` は `json<{ result: Array<Holomem>; }>()` のように型引数の最後にセミコロンを必ず付ける
    - API 呼び出しの例外は `try/catch` の中に閉じ込み、`.catch()` は使わない
    - 画面入力のバリデーションは共有の Zod schema を使う。空文字チェックが必要なときは `isEmpty()` のみを使い、`=== ''` などの比較はしない
    - フォームやボタンの見た目は既存の global CSS を優先し、不要な `className` を増やさない
- プロジェクト固有のルール
    - JWT は LocalStorage に保存する。HttpOnly Cookie やサーバーサイド連携の Cookie 認証は使わない
    - `null` を許容する値は `string | null | undefined` とし、`0 / 1` のような真偽値は `preprocessBooleanNumber` と `z.union([z.literal(0), z.literal(1)])` を使う
    - `sort_order` などの並び順は `1` 以上の整数を要求する。必要に応じて `value == null ? 0 : value` のような前処理をして、意図的に不正入力を弾くことがある

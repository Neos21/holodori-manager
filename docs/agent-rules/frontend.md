# Frontend Rules

`client/` を変更する場合に適用する。


## State と画面状態

- 既存 State から導出できる表示状態のために、重複した State を追加しない
- `useState` は行末コメントで用途と `null`・空文字などの特殊状態を示す
- 初期読込中も入力欄の位置と見た目を維持する場合は、スピナーへの置換や `disabled` のグレーアウトを避け、空の入力欄を `readOnly` で表示する
- 入力欄の位置をずらしたくない可変メッセージは入力欄より後に置く
- 他画面で採用されていない Hook を Lint 回避だけのために導入せず、既存画面の実装パターンを優先する


## 認証と遷移

- LocalStorage の認証情報は Zustand Store の復元完了後に判定する
- JWT を削除する前にリダイレクト理由を SessionStorage に保存する
- 表示側で読み取った理由は削除し、通常遷移や再読み込み後に残さない
- アプリ内遷移は React Router の `useNavigate()` を使う


## イベントと API

- イベントハンドラは `onSubmit`・`onLoadFoo`・`onChangeBar` のように `on` を接頭辞にする
- `handleHoge` 系の命名を使わない
- UX で発火するフォーム送信は `react` から Type Import した `SubmitEvent` を使い、`FormEvent` は使わない
- 入力バリデーションには `shared/schemas/` の Zod Schema を使い、空文字チェックには `isEmpty()` を使う
- `ky` の `json<T>()` は `json<{ result: Array<Holomem>; }>()` のように型引数末尾へセミコロンを付ける
- API 呼び出しの例外は `try`・`catch` の中に閉じ込め、Promise の `.then()`・`.catch()` を使わない
- 「取得・追加・更新・削除に失敗しました」の定型文言は `client/constants/client-messages.ts` の生成関数を使う
- 使用箇所が1つだけの固定文言は定数化せず、呼出元へ直接記述する


## JSX とレイアウト

- 条件付き JSX は `{condition && ( ... )}` のように JSX 部分をカッコで囲み、改行・インデントする
- `aria-*` 属性と `role` 属性は使用しない
- マージンは下方向に付与し、上方向のマージンは使用しない

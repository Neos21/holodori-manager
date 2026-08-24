import '@testing-library/jest-dom/vitest';

/*
 * Vitest で全てのテストが実行される前に自動で一度だけ読み込まれる共通の前処理用ファイル (`vite.config.ts` にて指定している)
 * 
 * - Vitest に関連する npm パッケージ
 *     - jsdom : Node.js 上にブラウザ DOM 環境を作る
 *     - @testing-library/dom : DOM をユーザ視点で検索するための機能を提供する
 *     - @testing-library/react : React コンポーネントを Render できるようにする
 *     - @testing-library/user-event : `click()`・`type()` などユーザ操作を再現する機能を提供する
 *     - @testing-library/jest-dom : `expect(...).toBeVisible()` 等のテスト機能を追加する
 * - Vitest は標準で `.test.ts`・`.test.tsx` および `.benchmark.ts` を認識できる
 * - React 向けの `.test.tsx` を作る際は1行目に `// @vitest-environment jsdom` コメントを入れることで環境を設定する
 * - VSCode で `プロパティ 'toBeDisabled' は型 'Assertion<HTMLElement>' に存在しません。ts(2339)` などのエラーが出る場合はコマンドパレットで `TypeScript : Restart TS Server` (TS サーバーを再起動) を選択すれば良い
 *     - `.vscode/settings.json` でも `js/ts.tsdk.path` で明示的に TS サーバ向け設定をしている
 *     - `tsconfig.json` の `compilerOptions.types` でも明示的に型が認識できるようにしてある
 */

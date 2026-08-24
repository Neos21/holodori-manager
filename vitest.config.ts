import { defineConfig } from 'vitest/config';

/** Vitest 設定 */
export default defineConfig({
  test: {
    environment: 'node',
    // セットアップファイルを指定する
    setupFiles: ['./vitest.setup.ts'],
    restoreMocks: true,
    // ベンチマーク用テストファイルの定義
    benchmark: {
      include: ['**/*.benchmark.ts']
    },
    // カバレッジレポート出力用の設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: [
        'client/**/*.{ts,tsx}',
        'server/**/*.ts',
        'shared/**/*.ts'
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.benchmark.{ts,tsx}',
        '**/*.d.ts'
      ]
    }
  }
});

import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';

/** Vite 設定 */
export default defineConfig({
  plugins: [
    cloudflare({  // Vite に Cloudflare Workers ランタイムを統合するプラグイン https://developers.cloudflare.com/workers/vite-plugin/
      viteEnvironment: {
        name: 'ssr'
      }
    }),
    tailwindcss(),  // TailwindCSS プラグイン
    reactRouterHonoServer({  // Hono + React Router 構成を認識させるプラグイン・`reactRouter()` より手前に置くこと
      runtime: 'cloudflare',
      serverEntryPoint: './server/index.ts'
    }),
    reactRouter()  // React Router プラグイン
  ],
  build: {
    rollupOptions: {
      // フロントエンドのビルド資材の命名ルールを変更する
      output: {
        entryFileNames: `assets/entry-[hash].js`,
        chunkFileNames: `assets/chunk-[hash].js`,
        assetFileNames: `assets/asset-[hash].[ext]`
      }
    }
  }
});

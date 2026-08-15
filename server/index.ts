import { Hono } from 'hono';

import { api, apiPath } from './routes/api/api';

import type { HonoBindings } from './types/hono-bindings';

const app = new Hono<{ Bindings: HonoBindings; }>();

app.route(apiPath, api);  // `routes/` ディレクトリ配下は URI パスとディレクトリ階層を揃えるため `/api` 配下からクラスを別けて作る

// `wrangler.jsonc` にてエントリポイントと識別するため Default Export が必須
export default app;

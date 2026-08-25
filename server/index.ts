
import { createHonoServer } from 'react-router-hono-server/cloudflare';

import { api, apiPath } from './routes/api/api';


/**
 * `wrangler.jsonc` にてエントリポイントと識別するため Default Export が必須
 * 
 * NOTE : `$ vite dev` コマンドで認識させるため `createHonoServer()` でのラップが必要・以下のような以前のコードでは動かない
 * 
 * ```typescript
 * import { Hono } from 'hono';
 * import type { HonoBindings } from './types/hono-bindings';
 * const app = new Hono<{ Bindings : HonoBindings; }>();
 * app.route(apiPath, api);
 * export default app;
 * ```
 */
export default await createHonoServer({
  configure(app) {
    app.route(apiPath, api);  // `routes/` ディレクトリ配下は URI パスとディレクトリ階層を揃えるため `/api` 配下からクラスを別けて作る
  }
});

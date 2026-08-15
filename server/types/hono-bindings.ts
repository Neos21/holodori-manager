/** Hono Context から参照する Cloudflare Workers の Binding */
export type HonoBindings = {
  /** Cloudflare D1 データベース */
  DB: D1Database;
  
  /** ログイン時に照合するパスワード */
  ADMIN_PASSWORD: string;
  /** JWT の署名・検証に使用するシークレット */
  ADMIN_JWT_SECRET: string;
};

import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { memoSchema } from '../../../../shared/schemas/memo-schema';
import { MemoRepository } from '../../../repositories/memo-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const memo = new Hono<{ Bindings: HonoBindings; }>();
export const memoPath = '/memo';

memo.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

memo.get('/', async context => {
  const result = await new MemoRepository(context.env.DB).findOne();
  return context.json({ result }, httpStatusCode.ok);
});

memo.patch('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const parsed = memoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  // `memo` テーブルは単一行で運用する想定のため、1件取得できれば UPDATE・1件も取得できなければ INSERT で処理する
  const memoRepository = new MemoRepository(context.env.DB);
  const existing = await memoRepository.findOne();
  if(existing == null) {
    const id = await memoRepository.create(parsed.data);
    return context.json({ result: { id } }, httpStatusCode.created);
  }
  else {
    await memoRepository.update(existing.id, parsed.data);
    return context.json({ result: { id: existing.id } }, httpStatusCode.ok);
  }
});

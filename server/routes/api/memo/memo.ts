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
  const result = await new MemoRepository(context.env.DB).find();
  return context.json({ result }, httpStatusCode.ok);
});

memo.patch('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const parsed = memoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const repository = new MemoRepository(context.env.DB);
  const existing = await repository.find();
  if(existing == null) {
    const id = await repository.create(parsed.data);
    return context.json({ result: { id } }, httpStatusCode.created);
  }
  
  await repository.update(existing.id, parsed.data);
  return context.json({ result: { id: existing.id } }, httpStatusCode.ok);
});

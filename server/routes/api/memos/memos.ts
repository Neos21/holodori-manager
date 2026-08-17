import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { defaultMemoId } from '../../../../shared/constants/app-constants';
import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { memoSchema } from '../../../../shared/schemas/memo-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-messages';
import { MemosRepository } from '../../../repositories/memos-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const memos = new Hono<{ Bindings: HonoBindings; }>();
export const memosPath = '/memos' as const;

memos.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** メモ一覧を取得する */
memos.get('/', async context => {
  const result = await new MemosRepository(context.env.DB).findAll();
  return context.json({ result }, httpStatusCode.ok);
});

/** メモを追加する */
memos.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = memoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const id = await new MemosRepository(context.env.DB).create(parsed.data);
  return context.json({ result: { id } }, httpStatusCode.created);
});

/** 指定したメモを更新する */
memos.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = memoSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new MemosRepository(context.env.DB).update(id, parsed.data);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

/** 指定したメモを削除する・デフォルトのメモは削除を許可しない */
memos.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  if(id === defaultMemoId) return context.json({ error: 'デフォルトのメモは削除できません' }, httpStatusCode.badRequest);
  
  await new MemosRepository(context.env.DB).delete(id);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

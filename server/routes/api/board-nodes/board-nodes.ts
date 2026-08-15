import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { boardNodeSchema } from '../../../../shared/schemas/board-node-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-messages';
import { BoardNodesRepository } from '../../../repositories/board-nodes-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const boardNodes = new Hono<{ Bindings: HonoBindings; }>();
export const boardNodesPath = '/board-nodes' as const;

boardNodes.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** ボードマス一覧を取得する */
boardNodes.get('/', async context => {
  const boardNodes = await new BoardNodesRepository(context.env.DB).findAll();
  return context.json({ result: boardNodes }, httpStatusCode.ok);
});

/** ボードマスを追加する */
boardNodes.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = boardNodeSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const id = await new BoardNodesRepository(context.env.DB).create(parsed.data);
  return context.json({ result: { id } }, httpStatusCode.created);
});

/** 指定したボードマスを更新する */
boardNodes.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  // `superRefine` を使っているスキーマは `partial()` が使えない・PATCH 操作だが毎回全項目が送られてくるのでココでは `partial()` 不要
  const parsed = boardNodeSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new BoardNodesRepository(context.env.DB).update(id, parsed.data);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

/** 指定したボードマスを削除する */
boardNodes.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  await new BoardNodesRepository(context.env.DB).delete(id);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

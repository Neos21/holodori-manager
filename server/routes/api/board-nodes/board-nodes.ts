import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { boardNodeSchema } from '../../../../shared/schemas/board-node-schema';
import { BoardNodesRepository } from '../../../repositories/board-nodes-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const boardNodes = new Hono<{ Bindings: HonoBindings; }>();
export const boardNodesPath = '/board-nodes';

boardNodes.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

boardNodes.get('/', async context => {
  const boardNodes = await new BoardNodesRepository(context.env.DB).findAll();
  return context.json({ result: boardNodes }, httpStatusCode.ok);
});

boardNodes.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const parsed = boardNodeSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const id = await new BoardNodesRepository(context.env.DB).create(parsed.data);
  return context.json({ result: { id } }, httpStatusCode.created);
});

boardNodes.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: 'ID が不正です' }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const parsed = boardNodeSchema.partial().safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new BoardNodesRepository(context.env.DB).update(id, parsed.data);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

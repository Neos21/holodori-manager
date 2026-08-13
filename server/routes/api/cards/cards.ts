import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { cardSchema } from '../../../../shared/schemas/card-schema';
import { CardsRepository } from '../../../repositories/cards-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const cards = new Hono<{ Bindings: HonoBindings; }>();
export const cardsPath = '/cards';

cards.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

cards.get('/', async context => {
  const cards = await new CardsRepository(context.env.DB).findAll();
  return context.json({ result: cards }, httpStatusCode.ok);
});

cards.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const parsed = cardSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const id = await new CardsRepository(context.env.DB).create(parsed.data);
  return context.json({ result: { id } }, httpStatusCode.created);
});

cards.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: 'ID が不正です' }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const parsed = cardSchema.partial().safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new CardsRepository(context.env.DB).update(id, parsed.data);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

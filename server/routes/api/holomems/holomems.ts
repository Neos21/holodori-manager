import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { holomemSchema } from '../../../../shared/schemas/holomem-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-messages';
import { HolomemsRepository } from '../../../repositories/holomems-repository';
import { HolomemsService } from '../../../services/holomems-service';

import type { HonoBindings } from '../../../types/hono-bindings';

export const holomems = new Hono<{ Bindings: HonoBindings; }>();
export const holomemsPath = '/holomems' as const;

holomems.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

holomems.get('/', async context => {
  const holomems = await new HolomemsRepository(context.env.DB).findAll();
  return context.json({ result: holomems }, httpStatusCode.ok);
});

holomems.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = holomemSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  // サービスクラスを経由することでホロメンに付随するカードなどを自動生成する
  const id = await new HolomemsService(context.env.DB).create(parsed.data);
  return context.json({ result: { id } }, httpStatusCode.created);
});

holomems.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = holomemSchema.partial().safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new HolomemsRepository(context.env.DB).update(id, parsed.data);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

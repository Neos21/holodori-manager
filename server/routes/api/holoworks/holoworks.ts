import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { holoworkSchema } from '../../../../shared/schemas/holowork-schema';
import { ActiveHoloworkMembersRepository } from '../../../repositories/active-holowork-members-repository';
import { HoloworksRepository } from '../../../repositories/holoworks-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const holoworks = new Hono<{ Bindings: HonoBindings; }>();
export const holoworksPath = '/holoworks';

holoworks.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

holoworks.get('/', async context => {
  const holoworks = await new HoloworksRepository(context.env.DB).findAll();
  return context.json({ result: holoworks }, httpStatusCode.ok);
});

holoworks.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const parsed = holoworkSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const id = await new HoloworksRepository(context.env.DB).create(parsed.data);
  return context.json({ result: { id } }, httpStatusCode.created);
});

holoworks.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(Number.isNaN(id)) return context.json({ error: 'ホロワーク ID が不正です' }, httpStatusCode.badRequest);
  
  const activeMembers = await new ActiveHoloworkMembersRepository(context.env.DB).findByHoloworksId(id);
  if(activeMembers.length > 0) return context.json({ error: '活動中のメンバーがいるため削除できません' }, httpStatusCode.badRequest);
  
  await new HoloworksRepository(context.env.DB).delete(id);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

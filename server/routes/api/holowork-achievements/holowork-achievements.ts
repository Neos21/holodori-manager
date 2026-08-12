import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { holoworkAchievementSchema } from '../../../../shared/schemas/holowork-achievement-schema';
import { HoloworkAchievementsRepository } from '../../../repositories/holowork-achievements-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const holoworkAchievements = new Hono<{ Bindings: HonoBindings; }>();
export const holoworkAchievementsPath = '/holowork-achievements';

holoworkAchievements.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

holoworkAchievements.get('/', async context => {
  const achievements = await new HoloworkAchievementsRepository(context.env.DB).findAll();
  return context.json({ result: achievements }, httpStatusCode.ok);
});

holoworkAchievements.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(Number.isNaN(id)) return context.json({ error: 'アチーブメント ID が不正です' }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const parsed = holoworkAchievementSchema.partial().safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new HoloworkAchievementsRepository(context.env.DB).update(id, parsed.data);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

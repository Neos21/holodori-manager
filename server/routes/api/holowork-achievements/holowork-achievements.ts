import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { holoworkAchievementSchema } from '../../../../shared/schemas/holowork-achievement-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-messages';
import { HoloworkAchievementsRepository } from '../../../repositories/holowork-achievements-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const holoworkAchievements = new Hono<{ Bindings: HonoBindings; }>();
export const holoworkAchievementsPath = '/holowork-achievements' as const;

holoworkAchievements.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** 指定したホロワーク達成状況を更新する */
holoworkAchievements.patch('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = holoworkAchievementSchema.partial().safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  await new HoloworkAchievementsRepository(context.env.DB).update(id, parsed.data);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

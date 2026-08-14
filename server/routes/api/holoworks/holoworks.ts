import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { candidatePriorities } from '../../../../shared/constants/app-constants';
import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { holoworkSchema } from '../../../../shared/schemas/holowork-schema';
import { ActiveHoloworkMembersRepository } from '../../../repositories/active-holowork-members-repository';
import { HoloworksRepository } from '../../../repositories/holoworks-repository';
import { HoloworkCandidatesService } from '../../../services/holowork-candidates-service';
import { HoloworkMemberStatusesService } from '../../../services/holowork-member-statuses-service';

import type { CandidatePriority } from '../../../../shared/types/app-types';
import type { HonoBindings } from '../../../types/hono-bindings';

export const holoworks = new Hono<{ Bindings: HonoBindings; }>();
export const holoworksPath = '/holoworks' as const;

holoworks.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

holoworks.get('/', async context => {
  const holoworks = await new HoloworksRepository(context.env.DB).findAll();
  return context.json({ result: holoworks }, httpStatusCode.ok);
});

/** 有効なホロメンのホロワーク達成状況・活動状況・黄マス情報を取得する */
holoworks.get('/member-statuses', async context => {
  const memberStatuses = await new HoloworkMemberStatusesService(context.env.DB).findAll();
  return context.json({ result: memberStatuses }, httpStatusCode.ok);
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
  if(!Number.isInteger(id)) return context.json({ error: 'ID が不正です' }, httpStatusCode.badRequest);
  
  const holowork = await new HoloworksRepository(context.env.DB).findById(id);
  if(holowork == null) return context.json({ error: '指定のホロワークが見つかりません' }, httpStatusCode.notFound);
  
  const activeHoloworkMembers = await new ActiveHoloworkMembersRepository(context.env.DB).findByHoloworksId(id);
  if(activeHoloworkMembers.length > 0) return context.json({ error: '活動中のメンバーがいるため削除できません' }, httpStatusCode.badRequest);
  
  await new HoloworksRepository(context.env.DB).delete(id);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

/** ホロワークで優先的に選択すべきホロメン候補を取得する */
holoworks.get('/:id/candidates', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: 'ID が不正です' }, httpStatusCode.badRequest);
  
  const priority = context.req.query('priority');
  if(isEmpty(priority)) return context.json({ error: 'priority パラメータを指定してください' }, httpStatusCode.badRequest);
  if(!candidatePriorities.includes(priority as CandidatePriority)) return context.json({ error: 'priority の値が不正です' }, httpStatusCode.badRequest);
  
  const holowork = await new HoloworksRepository(context.env.DB).findById(id);
  if(holowork == null) return context.json({ error: '指定のホロワークが見つかりません' }, httpStatusCode.notFound);
  
  const candidates = await new HoloworkCandidatesService(context.env.DB).getCandidates(priority as CandidatePriority);
  return context.json({ result: candidates }, httpStatusCode.ok);
});

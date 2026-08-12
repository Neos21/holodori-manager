import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { ActiveHoloworkMembersRepository } from '../../../repositories/active-holowork-members-repository';
import { HoloworkAchievementsRepository } from '../../../repositories/holowork-achievements-repository';
import { HoloworksRepository } from '../../../repositories/holoworks-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const activeHoloworkMembers = new Hono<{ Bindings: HonoBindings; }>();
export const activeHoloworkMembersPath = '/active-holowork-members';

activeHoloworkMembers.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

activeHoloworkMembers.get('/', async context => {
  const members = await new ActiveHoloworkMembersRepository(context.env.DB).findAll();
  return context.json({ result: members }, httpStatusCode.ok);
});

activeHoloworkMembers.post('/:id/start', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const holoworksId = Number(context.req.param('id'));
  if(Number.isNaN(holoworksId)) return context.json({ error: 'ホロワーク ID が不正です' }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  const holomemIds = Array.isArray(body.holomem_ids) ? body.holomem_ids : null;
  if(holomemIds == null || holomemIds.length < 1 || holomemIds.length > 5 || !holomemIds.every((id: unknown) => typeof id === 'number' && !Number.isNaN(id))) {
    return context.json({ error: 'holomem_ids は 1〜5 件の数値配列である必要があります' }, httpStatusCode.badRequest);
  }
  
  const parsedHolomemIds = holomemIds as number[];
  const activeHoloworkMembersRepository = new ActiveHoloworkMembersRepository(context.env.DB);
  const existing = await Promise.all(parsedHolomemIds.map(id => activeHoloworkMembersRepository.findByHolomemsId(id)));
  if(existing.some(member => member != null)) {
    return context.json({ error: '他枠で活動中のホロメンが含まれています' }, httpStatusCode.badRequest);
  }
  
  const holowork = await new HoloworksRepository(context.env.DB).findById(holoworksId);
  if(holowork == null) return context.json({ error: 'ホロワークが見つかりません' }, httpStatusCode.notFound);
  
  const ids = [] as number[];
  for(const holomemId of parsedHolomemIds) {
    const id = await activeHoloworkMembersRepository.create({ holoworks_id: holoworksId, holomems_id: holomemId });
    ids.push(id);
  }
  
  return context.json({ result: { ids } }, httpStatusCode.created);
});

activeHoloworkMembers.post('/:id/complete', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const holoworksId = Number(context.req.param('id'));
  if(Number.isNaN(holoworksId)) return context.json({ error: 'ホロワーク ID が不正です' }, httpStatusCode.badRequest);
  
  const activeHoloworkMembersRepository = new ActiveHoloworkMembersRepository(context.env.DB);
  const members = await activeHoloworkMembersRepository.findByHoloworksId(holoworksId);
  if(members.length === 0) return context.json({ error: '活動中のメンバーが存在しません' }, httpStatusCode.badRequest);
  
  const holomemIds = members.map(member => member.holomems_id);
  const holoworkAchievementsRepository = new HoloworkAchievementsRepository(context.env.DB);
  
  for(const holomemId of holomemIds) {
    await holoworkAchievementsRepository.incrementCountByHolomemsId(holomemId);
  }
  
  await activeHoloworkMembersRepository.deleteByHoloworksId(holoworksId);
  
  return context.json({ result: { holomem_ids: holomemIds } }, httpStatusCode.ok);
});

activeHoloworkMembers.post('/:id/abort', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const holoworksId = Number(context.req.param('id'));
  if(Number.isNaN(holoworksId)) return context.json({ error: 'ホロワーク ID が不正です' }, httpStatusCode.badRequest);
  
  const activeHoloworkMembersRepository = new ActiveHoloworkMembersRepository(context.env.DB);
  await activeHoloworkMembersRepository.deleteByHoloworksId(holoworksId);
  return context.json({ result: { holoworks_id: holoworksId } }, httpStatusCode.ok);
});

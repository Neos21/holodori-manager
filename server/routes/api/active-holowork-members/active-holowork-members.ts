import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { ActiveHoloworkMembersRepository } from '../../../repositories/active-holowork-members-repository';
import { HoloworkAchievementsRepository } from '../../../repositories/holowork-achievements-repository';
import { HoloworksRepository } from '../../../repositories/holoworks-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const activeHoloworkMembers = new Hono<{ Bindings: HonoBindings; }>();
export const activeHoloworkMembersPath = '/active-holowork-members' as const;

activeHoloworkMembers.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

activeHoloworkMembers.get('/', async context => {
  const members = await new ActiveHoloworkMembersRepository(context.env.DB).findAll();
  return context.json({ result: members }, httpStatusCode.ok);
});

/** ホロワーク開始 */
activeHoloworkMembers.post('/:id/start', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  /** ホロワーク ID */
  const id = Number(context.req.param('id'));  // Number 型にする
  if(!Number.isInteger(id)) return context.json({ error: 'ID が不正です' }, httpStatusCode.badRequest);  // 整数のみ許容する
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, httpStatusCode.badRequest);
  
  // 指定のホロワーク ID が存在するかチェックする
  const holowork = await new HoloworksRepository(context.env.DB).findById(id);
  if(holowork == null) return context.json({ error: '指定のホロワークが見つかりません' }, httpStatusCode.notFound);
  
  // 「選択されたメンバー (ホロメン ID の配列)」が1人以上・5人以下・いずれも ID として妥当な整数値であることをチェックする
  const holomemsIds = Array.isArray(body.holomems_ids) ? body.holomems_ids : null;
  if(holomemsIds == null || holomemsIds.length < 1 || holomemsIds.length > 5 || holomemsIds.some((holomemsId: unknown) => Number.isInteger(holomemsId))) {
    return context.json({ error: '「選択されたメンバー」は 1〜5 件の数値配列である必要があります' }, httpStatusCode.badRequest);
  }
  
  const parsedHolomemsIds = holomemsIds as Array<number>;
  const activeHoloworkMembersRepository = new ActiveHoloworkMembersRepository(context.env.DB);
  
  // 「選択されたメンバー」に活動中のホロメンがいないかチェックする
  const existing = await Promise.all(parsedHolomemsIds.map(holomemsId => activeHoloworkMembersRepository.findByHolomemsId(holomemsId)));
  if(existing.some(member => member != null)) return context.json({ error: '他枠で活動中のホロメンが含まれています' }, httpStatusCode.badRequest);
  
  // 選択されたメンバーを「活動中」にする
  const activeHoloworkMemberIds: Array<number> = [];
  for(const holomemsId of parsedHolomemsIds) {
    const activeHoloworkMemberId = await activeHoloworkMembersRepository.create({ holoworks_id: id, holomems_id: holomemsId });
    activeHoloworkMemberIds.push(activeHoloworkMemberId);
  }
  
  // 生成された ID を一応返しておく (用途はないだろうけど)
  return context.json({ result: { active_holowork_member_ids: activeHoloworkMemberIds } }, httpStatusCode.created);
});

/** ホロワーク完了 */
activeHoloworkMembers.post('/:id/complete', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  /** ホロワーク ID */
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: 'ID が不正です' }, httpStatusCode.badRequest);
  
  const activeHoloworkMembersRepository = new ActiveHoloworkMembersRepository(context.env.DB);
  const holoworkAchievementsRepository = new HoloworkAchievementsRepository(context.env.DB);
  
  // 活動中のメンバーを取得する (もし1人もいなければ異常)
  const activeHoloworkMembers = await activeHoloworkMembersRepository.findByHoloworksId(id);
  if(activeHoloworkMembers.length === 0) return context.json({ error: '活動中のメンバーが存在しません' }, httpStatusCode.badRequest);
  
  // ホロワーク完了回数をインクリメントする
  const holomemsIds = activeHoloworkMembers.map(member => member.holomems_id);
  for(const holomemsId of holomemsIds) await holoworkAchievementsRepository.incrementCountByHolomemsId(holomemsId);
  
  // 対象のホロワーク ID で活動していたメンバー達を一括で解放する
  await activeHoloworkMembersRepository.deleteByHoloworksId(id);
  
  // 完了し解放されたメンバーの ID を返しておく
  return context.json({ result: { holomems_ids: holomemsIds } }, httpStatusCode.ok);
});

/** ホロワーク中断 */
activeHoloworkMembers.post('/:id/abort', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  /** ホロワーク ID */
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: 'ID が不正です' }, httpStatusCode.badRequest);
  
  // 対象のホロワーク ID で活動しているメンバー達を一括で開放する
  new ActiveHoloworkMembersRepository(context.env.DB).deleteByHoloworksId(id);
  
  // 操作したホロワーク ID を返しておく
  return context.json({ result: { id } }, httpStatusCode.ok);
});

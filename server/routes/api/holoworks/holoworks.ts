import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { candidatePriorities } from '../../../../shared/constants/app-constants';
import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { holoworkSchema } from '../../../../shared/schemas/holowork-schema';
import { startHoloworkSchema } from '../../../../shared/schemas/start-holowork-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-messages';
import { HoloworksRepository } from '../../../repositories/holoworks-repository';
import { HoloworkCandidatesService } from '../../../services/holowork-candidates-service';
import { HoloworkMemberStatusesService } from '../../../services/holowork-member-statuses-service';
import { HoloworksService } from '../../../services/holoworks-service';

import type { CandidatePriority } from '../../../../shared/types/app/holowork-candidate';
import type { Result } from '../../../../shared/types/utilities/result';
import type { HonoBindings } from '../../../types/hono-bindings';

export const holoworks = new Hono<{ Bindings: HonoBindings; }>();
export const holoworksPath = '/holoworks' as const;

holoworks.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** Result のエラーに指定された HTTP ステータスコードを取得する */
const getResultHttpStatusCode = (result: Result<unknown>): typeof httpStatusCode.badRequest | typeof httpStatusCode.notFound => result.httpStatusCode === httpStatusCode.notFound ? httpStatusCode.notFound : httpStatusCode.badRequest;

/** 活動中メンバーを含むホロワーク枠一覧を取得する */
holoworks.get('/', async context => {
  const holoworks = await new HoloworksService(context.env.DB).findAll();
  return context.json({ result: holoworks }, httpStatusCode.ok);
});

/** 有効なホロメンのホロワーク達成状況・活動状況・黄マス情報を取得する */
holoworks.get('/member-statuses', async context => {
  const memberStatuses = await new HoloworkMemberStatusesService(context.env.DB).findAll();
  return context.json({ result: memberStatuses }, httpStatusCode.ok);
});

/** 選択した優先モードに基づく優先候補とその他候補を取得する */
holoworks.get('/candidates', async context => {
  const priority = context.req.query('priority');
  if(isEmpty(priority)) return context.json({ error: 'priority パラメータを指定してください' }, httpStatusCode.badRequest);
  if(!candidatePriorities.includes(priority as CandidatePriority)) return context.json({ error: 'priority の値が不正です' }, httpStatusCode.badRequest);
  
  const candidates = await new HoloworkCandidatesService(context.env.DB).getCandidates(priority as CandidatePriority);
  return context.json({ result: candidates }, httpStatusCode.ok);
});

/** 新規ホロワーク枠を追加する */
holoworks.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = holoworkSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const id = await new HoloworksRepository(context.env.DB).create(parsed.data);
  return context.json({ result: { id } }, httpStatusCode.created);
});

/** ホロワークを開始する */
holoworks.post('/:id/start', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = startHoloworkSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  const startResult = await new HoloworksService(context.env.DB).start(id, parsed.data.holomems_ids);
  if(startResult.error != null) return context.json({ error: startResult.error }, getResultHttpStatusCode(startResult));
  return context.json({ result: { active_holowork_member_ids: startResult.result } }, httpStatusCode.created);
});

/** ホロワークを完了する */
holoworks.post('/:id/complete', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const completeResult = await new HoloworksService(context.env.DB).complete(id);
  if(completeResult.error != null) return context.json({ error: completeResult.error }, getResultHttpStatusCode(completeResult));
  return context.json({ result: { holomems_ids: completeResult.result } }, httpStatusCode.ok);
});

/** ホロワークを中断する */
holoworks.post('/:id/abort', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const abortResult = await new HoloworksService(context.env.DB).abort(id);
  if(abortResult.error != null) return context.json({ error: abortResult.error }, getResultHttpStatusCode(abortResult));
  return context.json({ result: { id } }, httpStatusCode.ok);
});

/** 活動中メンバーがいないホロワーク枠を削除する */
holoworks.delete('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const deleteResult = await new HoloworksService(context.env.DB).delete(id);
  if(deleteResult.error != null) return context.json({ error: deleteResult.error }, getResultHttpStatusCode(deleteResult));
  return context.json({ result: { id } }, httpStatusCode.ok);
});

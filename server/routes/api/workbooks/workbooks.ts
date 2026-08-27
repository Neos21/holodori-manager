import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { maxWorkbookSnapshotBytes } from '../../../../shared/constants/app-constants';
import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { updateWorkbookSchema } from '../../../../shared/schemas/workbook-schema';
import { invalidIdErrorMessage, invalidRequestBodyErrorMessage } from '../../../constants/server-messages';
import { WorkbooksRepository } from '../../../repositories/workbooks-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const workbooks = new Hono<{ Bindings: HonoBindings; }>();
export const workbooksPath = '/workbooks' as const;

workbooks.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

/** 指定されたワークブックを取得する */
workbooks.get('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const workbook = await new WorkbooksRepository(context.env.DB).findById(id);
  if(workbook == null) return context.json({ error: 'ワークブックが存在しません' }, httpStatusCode.notFound);
  
  return context.json({ result: { id: workbook.id, snapshot: JSON.parse(workbook.snapshot) } }, httpStatusCode.ok);
});

/** 指定されたワークブックのスナップショット全体を作成または置き換える */
workbooks.put('/:id', async context => {  // eslint-disable-line neos-eslint-plugin/comment-colon-spacing
  const id = Number(context.req.param('id'));
  if(!Number.isInteger(id)) return context.json({ error: invalidIdErrorMessage }, httpStatusCode.badRequest);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: invalidRequestBodyErrorMessage }, httpStatusCode.badRequest);
  
  const parsed = updateWorkbookSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, httpStatusCode.badRequest);
  
  // D1 の行データの上限が 2MB なので、それ以下の余裕を持ったデータ量に収まっていることをチェックする
  const snapshot = JSON.stringify(parsed.data.snapshot);
  if(new TextEncoder().encode(snapshot).byteLength > maxWorkbookSnapshotBytes) {
    return context.json({ error: 'ワークブックのデータ量が保存上限 (1.9MB) を超えています' }, httpStatusCode.badRequest);
  }
  
  await new WorkbooksRepository(context.env.DB).upsert(id, snapshot);
  return context.json({ result: { id } }, httpStatusCode.ok);
});

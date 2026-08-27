import z from 'zod';

/** ワークシート1つを示すスキーマ・`z.looseObject()` によりスキーマに定義していないフィールドを削除しないようにしてある */
const workbookSheetSchema = z.looseObject({
  id  : z.string().min(1),
  name: z.string()
});

/** Univer Sheets が保存したワークブックスナップショットの主要構造を検証するスキーマ・`z.looseObject()` によりスキーマに定義していないフィールドを削除しないようにしてある */
export const workbookSnapshotSchema = z.looseObject({
  id        : z.string().min(1),
  name      : z.string(),
  appVersion: z.string().min(1),
  locale    : z.string().min(1),
  styles    : z.record(z.string(), z.unknown()),
  sheetOrder: z.array(z.string().min(1)).min(1),
  sheets    : z.record(z.string(), workbookSheetSchema)
}).superRefine((snapshot, context) => {
  const sheetIds = Object.keys(snapshot.sheets);
  if(new Set(snapshot.sheetOrder).size !== snapshot.sheetOrder.length) {
    context.addIssue({ code: 'custom', message: 'シートの表示順に重複があります', path: ['sheetOrder'] });
  }
  if(snapshot.sheetOrder.length !== sheetIds.length || snapshot.sheetOrder.some(sheetId => snapshot.sheets[sheetId] == null)) {
    context.addIssue({ code: 'custom', message: 'シートの表示順とシートデータが一致しません', path: ['sheetOrder'] });
  }
  sheetIds.forEach(sheetId => {
    if(snapshot.sheets[sheetId]?.id !== sheetId) context.addIssue({ code: 'custom', message: 'シート ID とシートデータが一致しません', path: ['sheets', sheetId, 'id'] });
  });
});

/** ワークブック全体を置き換えるリクエストのスキーマ */
export const updateWorkbookSchema = z.object({
  snapshot: workbookSnapshotSchema
});

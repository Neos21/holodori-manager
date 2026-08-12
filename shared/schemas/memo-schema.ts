import z from 'zod';

import { preprocessMultiLinesString } from './schema-utilities';

export const memoContentDisplayName = 'メモ' as const;

export const memoSchema = z.object({
  content: z.preprocess(
             preprocessMultiLinesString,
             z.string({ error: `${memoContentDisplayName}に文字列でないデータが入力されています` })
               .nullish()
           )
});

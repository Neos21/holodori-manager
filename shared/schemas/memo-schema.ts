import z from 'zod';

import { preprocessMultiLinesString, zodErrorMessages } from './schema-utilities';

const memoContentDisplayName = '自由メモ' as const;

/** 自由メモの保存時に本文の改行を正規化して検証するスキーマ */
export const memoSchema = z.object({
  content : z.preprocess(
              preprocessMultiLinesString,
              z.string({ error: zodErrorMessages.invalidType(memoContentDisplayName) })
                .nullish()
            )
});

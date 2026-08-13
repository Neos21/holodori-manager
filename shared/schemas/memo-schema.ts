import z from 'zod';

import { preprocessMultiLinesString, zodErrorMessages } from './schema-utilities';

export const memoContentDisplayName = '自由メモ' as const;

export const memoSchema = z.object({
  content : z.preprocess(
              preprocessMultiLinesString,
              z.string({ error: zodErrorMessages.invalidType(memoContentDisplayName) })
                .nullish()
            )
});

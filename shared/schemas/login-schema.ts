import z from 'zod';

import { preprocessOneLineString } from './schema-utilities';

export const passwordDisplayName = 'パスワード' as const;

export const loginSchema = z.object({
  password: z.preprocess(
              preprocessOneLineString,
              z.string({ error: `${passwordDisplayName}に文字列でないデータが入力されています` })
                .min(1, { error: `${passwordDisplayName}を入力してください` })
            )
});

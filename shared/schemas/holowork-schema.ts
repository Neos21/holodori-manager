import z from 'zod';

import { preprocessOneLineString } from './schema-utilities';

export const holoworkNameDisplayName = '枠名' as const;

export const holoworkSchema = z.object({
  name: z.preprocess(
          preprocessOneLineString,
          z.string({ error: `${holoworkNameDisplayName}に文字列でないデータが入力されています` })
            .min(1, { error: `${holoworkNameDisplayName}を入力してください` })
        )
});

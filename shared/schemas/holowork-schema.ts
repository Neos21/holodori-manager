import z from 'zod';

import { preprocessOneLineString, zodErrorMessages } from './schema-utilities';

export const holoworkNameDisplayName = '枠の名前' as const;

/** ホロワーク枠の作成時に枠名を正規化して検証するスキーマ */
export const holoworkSchema = z.object({
  name: z.preprocess(
          preprocessOneLineString,
          z.string({ error: zodErrorMessages.invalidType(holoworkNameDisplayName) })
            .min(1, { error: zodErrorMessages.empty(holoworkNameDisplayName) })
        )
});

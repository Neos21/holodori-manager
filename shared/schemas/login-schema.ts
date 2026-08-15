import z from 'zod';

import { preprocessOneLineString, zodErrorMessages } from './schema-utilities';

const passwordDisplayName = 'パスワード' as const;

export const loginSchema = z.object({
  password: z.preprocess(
              preprocessOneLineString,
              z.string({ error: zodErrorMessages.invalidType(passwordDisplayName) })
                .min(1, { error: zodErrorMessages.empty(passwordDisplayName) })
            )
});

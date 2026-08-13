import z from 'zod';

import { preprocessBooleanNumber, preprocessOneLineString, zodErrorMessages } from './schema-utilities';
import { booleanNumberFalse, booleanNumberTrue } from '../constants/boolean-constants';
import { bloom0, blooms, defaultCardLevel, rarities } from '../constants/holodori-constants';
import { isEmpty } from '../helpers/is-empty';

export const holomemsIdDisplayName = 'ホロメン ID' as const;
export const rarityDisplayName     = 'レア度'      as const;
export const cardNameDisplayName   = 'カード名'    as const;
export const isOwnedDisplayName    = '所有状況'    as const;
export const levelDisplayName      = 'レベル'      as const;
export const bloomDisplayName      = '開花度'      as const;

export const cardSchema = z.object({
  holomems_id : z.preprocess(
                  value => isEmpty(value) ? -1 : value,  // 未入力時は負数にしてエラー扱いにする
                  z.coerce.number({ error: zodErrorMessages.invalidType(holomemsIdDisplayName) })
                    .int({ error: zodErrorMessages.integer(holomemsIdDisplayName) })
                    .min(0, { error: zodErrorMessages.minimumNumber(holomemsIdDisplayName, 0) })
                ),
  rarity      : z.preprocess(
                  value => isEmpty(value) ? -1 : Number(value),  // 未入力時は負数にしてエラー扱いにし、Number 型に変換しておく
                  z.union(rarities.map(rarity => z.literal(rarity)))
                    .refine(value => rarities.includes(value), { message: zodErrorMessages.generalInvalid(rarityDisplayName) }),
                ),
  name        : z.preprocess(
                  preprocessOneLineString,
                  z.string({ error: zodErrorMessages.invalidType(cardNameDisplayName) })
                    .min(1, { error: zodErrorMessages.empty(cardNameDisplayName) })
                ),
  is_owned    : z.preprocess(
                  preprocessBooleanNumber,
                  z.union([z.literal(booleanNumberFalse), z.literal(booleanNumberTrue)], { error: zodErrorMessages.booleanNumber(isOwnedDisplayName) })
                ),
  level       : z.preprocess(
                  value => isEmpty(value) ? defaultCardLevel : value,  // 未入力時は最低レベルとみなす
                  z.coerce.number({ error: zodErrorMessages.invalidType(levelDisplayName) })
                    .int({ error: zodErrorMessages.integer(levelDisplayName) })
                    .min(1, { error: zodErrorMessages.minimumNumber(levelDisplayName, 1) })
                ),
  bloom       : z.preprocess(
                  value => isEmpty(value) ? bloom0 : Number(value),  // 未入力時は開花 0 とみなし、Number 型に変換しておく
                  z.union(blooms.map(bloom => z.literal(bloom)))
                    .refine(value => blooms.includes(value), { message: zodErrorMessages.generalInvalid(bloomDisplayName) }),
                )
});

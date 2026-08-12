import z from 'zod';

import { preprocessBooleanNumber, preprocessOneLineString } from './schema-utilities';
import { rarities, blooms } from '../constants/holodori-constants';

export const holomemIdDisplayName = 'ホロメン ID' as const;
export const rarityDisplayName = 'レア度' as const;
export const cardNameDisplayName = 'カード名' as const;
export const isOwnedDisplayName = '所持状況' as const;
export const levelDisplayName = 'レベル' as const;
export const bloomDisplayName = '開花度' as const;

const numericEnum = <T extends readonly number[]>(values: T): z.ZodUnion<{ [K in keyof T]: z.ZodLiteral<T[K]>; }> =>
  z.union(values.map(value => z.literal(value)) as {
    [K in keyof T]: z.ZodLiteral<T[K]>;
  });

export const cardSchema = z.object({
  holomems_id: z.preprocess(
                value => value == null ? 0 : value,
                z.number({ error: `${holomemIdDisplayName}に数値が指定されていません` })
                  .int({ error: `${holomemIdDisplayName}には整数を入力してください` })
                  .min(1, { error: `${holomemIdDisplayName}は1以上で入力してください` })
              ),
  rarity     : numericEnum(rarities)
                    .refine(value => rarities.includes(value), { message: `${rarityDisplayName}は3・4・5のいずれかで指定してください` }),
  name       : z.preprocess(
                preprocessOneLineString,
                z.string({ error: `${cardNameDisplayName}に文字列でないデータが入力されています` })
                  .min(1, { error: `${cardNameDisplayName}を入力してください` })
              ),
  is_owned   : z.preprocess(
                preprocessBooleanNumber,
                z.union([z.literal(0), z.literal(1)])
              ),
  level      : z.preprocess(
                value => value == null ? 0 : value,
                z.number({ error: `${levelDisplayName}に数値が指定されていません` })
                  .int({ error: `${levelDisplayName}には整数を入力してください` })
                  .min(1, { error: `${levelDisplayName}は1以上で入力してください` })
              ),
  bloom      : z.preprocess(
                value => value == null ? 0 : value,
                numericEnum(blooms)
              )
});

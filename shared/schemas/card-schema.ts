import z from 'zod';

import { preprocessBooleanNumber, preprocessOneLineString } from './schema-utilities';
import { bloom0, blooms, rarities } from '../constants/holodori-constants';
import { isEmpty } from '../helpers/is-empty';
import { booleanNumberFalse, booleanNumberTrue } from '../types/type-utilities';

export const holomemsIdDisplayName = 'ホロメン ID' as const;
export const rarityDisplayName     = 'レア度'      as const;
export const cardNameDisplayName   = 'カード名'    as const;
export const isOwnedDisplayName    = '所有状況'    as const;
export const levelDisplayName      = 'レベル'      as const;
export const bloomDisplayName      = '開花度'      as const;

export const cardSchema = z.object({
  holomems_id : z.preprocess(
                  value => isEmpty(value) ? -1 : value,  // 未入力時は負数にしてエラー扱いにする
                  z.coerce.number({ error: `${holomemsIdDisplayName}に数値が指定されていません` })
                    .int({ error: `${holomemsIdDisplayName}には整数を入力してください` })
                    .min(0, { error: `${holomemsIdDisplayName}は 0 以上で入力してください` })
                ),
  rarity      : z.preprocess(
                  value => isEmpty(value) ? -1 : Number(value),  // 未入力時は負数にしてエラー扱いにし、Number 型に変換しておく
                  z.union(rarities.map(rarity => z.literal(rarity)))
                    .refine(value => rarities.includes(value), { message: `${rarityDisplayName}を正しく指定してください` }),
                ),
  name        : z.preprocess(
                  preprocessOneLineString,
                  z.string({ error: `${cardNameDisplayName}に文字列でないデータが入力されています` })
                    .min(1, { error: `${cardNameDisplayName}を入力してください` })
                ),
  is_owned    : z.preprocess(
                  preprocessBooleanNumber,
                  z.union([z.literal(booleanNumberFalse), z.literal(booleanNumberTrue)])
                ),
  level       : z.preprocess(
                  value => isEmpty(value) ? 0 : value,  // 未入力時は最低の Lv1 とみなす
                  z.coerce.number({ error: `${levelDisplayName}に数値が指定されていません` })
                    .int({ error: `${levelDisplayName}には整数を入力してください` })
                    .min(1, { error: `${levelDisplayName}は 1 以上で入力してください` })
                ),
  bloom       : z.preprocess(
                  value => isEmpty(value) ? bloom0 : Number(value),  // 未入力時は開花 0 とみなし、Number 型に変換しておく
                  z.union(blooms.map(bloom => z.literal(bloom)))
                    .refine(value => blooms.includes(value), { message: `${bloomDisplayName}を正しく指定してください` }),
                )
});

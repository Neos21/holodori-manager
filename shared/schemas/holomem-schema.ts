import z from 'zod';

import { preprocessBooleanNumber, preprocessMultiLinesString, preprocessOneLineString } from './schema-utilities';
import { booleanNumberFalse, booleanNumberTrue } from '../types/type-utilities';

export const sortOrderDisplayName = '表示順'     as const;
export const groupDisplayName     = 'グループ'   as const;
export const nameDisplayName      = 'タレント名' as const;
export const noteDisplayName      = '自由記入欄' as const;

export const holomemSchema = z.object({
  sort_order: z.preprocess(
                value => value == null ? 0 : value,  // 未入力時は 0 にしてエラー扱いにする
                z.coerce.number({ error: `${sortOrderDisplayName}に数値が指定されていません` })
                  .int({ error: `${sortOrderDisplayName}には整数を入力してください` })
                  .min(1, { error: `${sortOrderDisplayName}は 1 以上で入力してください` })
              ),
  group     : z.preprocess(
                preprocessOneLineString,
                z.string({ error: `${groupDisplayName}に文字列でないデータが入力されています` })
                  .min(1, { error: `${groupDisplayName}を入力してください` })
              ),
  name      : z.preprocess(
                preprocessOneLineString,
                z.string({ error: `${nameDisplayName}に文字列でないデータが入力されています` })
                  .min(1, { error: `${nameDisplayName}を入力してください` })
              ),
  note      : z.preprocess(
                preprocessMultiLinesString,
                z.string({ error: `${noteDisplayName}に文字列でないデータが入力されています` })
                  .nullish()
              ),
  is_active : z.preprocess(
                preprocessBooleanNumber,
                z.union([z.literal(booleanNumberFalse), z.literal(booleanNumberTrue)])
              )
});

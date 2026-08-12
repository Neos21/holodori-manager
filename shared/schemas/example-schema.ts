// TODO : サンプル

import z from 'zod';

import { preprocessMultiLinesString, preprocessOneLineString } from './schema-utilities';

export const idDisplayName       = 'ID'   as const;
export const nameDisplayName     = '名前' as const;
export const nameMaxLength       = 50     as const;
export const contentDisplayName  = '本文' as const;
export const contentMaxLength    = 500    as const;

export const exampleSchema = z.object({
  id      : z.coerce.number({ error: `${idDisplayName} に数値が指定されていません` })
              .int({ error: `${idDisplayName} に整数が指定されていません` })
              .min(1, { error: `${idDisplayName} に1以上の整数が指定されていません` })
              .nullish(),
  name    : z.preprocess(
              preprocessOneLineString,
              z.string({ error: `${nameDisplayName}に文字列でないデータが入力されています` })
                .max(nameMaxLength, { error: `${nameDisplayName}は${nameMaxLength}文字以内で入力してください` })
                .nullish()  // null・undefined
            ),
  content : z.preprocess(
              preprocessMultiLinesString,
              z.string({ error: `${contentDisplayName}に文字列でないデータが入力されています` })
                .min(1, { error: `${contentDisplayName}を入力してください` })
                .max(contentMaxLength, { error: `${contentDisplayName}は${contentMaxLength}文字以内で入力してください` })
            )
});

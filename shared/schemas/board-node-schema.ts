import z from 'zod';

import { preprocessBooleanNumber, preprocessMultiLinesString, preprocessOneLineString } from './schema-utilities';
import { isEmpty } from '../helpers/is-empty';
import { booleanNumberFalse, booleanNumberTrue } from '../types/type-utilities';

export const holomemsIdDisplayName   = 'ホロメン ID'            as const;
export const categoryDisplayName     = 'カテゴリ'               as const;
export const yellowTargetDisplayName = '報酬アップ対象アイテム' as const;
export const descriptionDisplayName  = 'マス効果の内容'         as const;
export const isUnlockedDisplayName   = '解放状況'               as const;
export const amountDisplayName       = '基礎効果量'             as const;
export const connectRateDisplayName  = 'コネクト増幅率'         as const;

const allowedCategories = ['red', 'blue', 'yellow', 'green'] as const;  // TODO : 共通化
const allowedYellowTargets = ['lesson_pt', 'cube', 'training'] as const;

export const boardNodeSchema = z.object({
  holomems_id   : z.preprocess(
                    value => isEmpty(value) ? -1 : value,  // 未入力時は負数にしてエラー扱いにする
                    z.coerce.number({ error: `${holomemsIdDisplayName}に数値が指定されていません` })  // `z.coerce.number()` で String 型が入ってきてもキャストする
                      .int({ error: `${holomemsIdDisplayName}には整数を入力してください` })
                      .min(0, { error: `${holomemsIdDisplayName}は 0 以上で入力してください` })
                  ),
  category      : z.preprocess(
                    preprocessOneLineString,
                    z.enum(allowedCategories, { message: `${categoryDisplayName}を正しく指定してください` })  // `z.enum()` は文字列のみ・`z.union()` は文字列以外も含められる
                  ),
  yellow_target : z.preprocess(
                    value => isEmpty(value) ? null : preprocessOneLineString(value),  // `null` とする場合もあるため振り分け
                    z.union([z.enum(allowedYellowTargets), z.null()])
                  ),
  description   : z.preprocess(
                    preprocessMultiLinesString,
                    z.string({ error: `${descriptionDisplayName}に文字列でないデータが入力されています` })
                      .min(1, { error: `${descriptionDisplayName}を入力してください` })
                  ),
  is_unlocked   : z.preprocess(
                    preprocessBooleanNumber,
                    z.union([z.literal(booleanNumberFalse), z.literal(booleanNumberTrue)])
                  ),
  amount        : z.preprocess(
                    value => isEmpty(value) ? 0 : value,
                    z.coerce.number({ error: `${amountDisplayName}に数値が指定されていません` })
                  ),
  connect_rate  : z.preprocess(
                    value => isEmpty(value) ? null : Number(value),  // `null` を許容する・そのため `z.coerce.number()` でのキャストはせず `Number()` で変換しておく
                    z.number({ error: `${connectRateDisplayName}に数値でないデータが入力されています` }).nullable()
                  )
}).superRefine((value, context) => {
  if(value.category === 'yellow' && isEmpty(value.yellow_target)) {  // TODO : 'yellow' を命名
    context.addIssue({ code: 'custom', message: `${yellowTargetDisplayName}を入力してください` });
  }
  if(value.category !== 'yellow' && !isEmpty(value.yellow_target)) {
    context.addIssue({ code: 'custom', message: `${yellowTargetDisplayName}は黄マス以外では指定できません` });
  }
});

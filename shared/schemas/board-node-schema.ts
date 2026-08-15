import z from 'zod';

import { preprocessBooleanNumber, preprocessMultiLinesString, preprocessOneLineString, zodErrorMessages } from './schema-utilities';
import { boardNodeYellowTargets } from '../constants/app-constants';
import { booleanNumberFalse, booleanNumberTrue } from '../constants/boolean-constants';
import { boardNodeCategories, boardNodeCategoryYellow } from '../constants/holodori-constants';
import { isEmpty } from '../helpers/is-empty';

const holomemsIdDisplayName          = 'ホロメン ID'            as const;
export const categoryDisplayName     = 'カテゴリ'               as const;
export const yellowTargetDisplayName = '報酬アップ対象アイテム' as const;
export const descriptionDisplayName  = 'マス効果の内容'         as const;
export const isUnlockedDisplayName   = '解放状況'               as const;
export const amountDisplayName       = '基礎効果量'             as const;
export const connectRateDisplayName  = 'コネクト増幅率'         as const;

export const boardNodeSchema = z.object({
  holomems_id   : z.preprocess(
                    value => isEmpty(value) ? 0 : value,  // 未入力時は 0 にしてエラー扱いにする (AUTOINCREMENT な ID は 1 から採番され 0 は登場しない)
                    z.coerce.number({ error: zodErrorMessages.invalidType(holomemsIdDisplayName) })  // `z.coerce.number()` で String 型が入ってきてもキャストする
                      .int({ error: zodErrorMessages.integer(holomemsIdDisplayName) })
                      .min(1, { error: zodErrorMessages.minimumNumber(holomemsIdDisplayName, 1) })
                  ),
  category      : z.preprocess(
                    preprocessOneLineString,
                    z.enum(boardNodeCategories, { error: zodErrorMessages.generalInvalid(categoryDisplayName) })  // `z.enum()` は文字列のみ・`z.union()` は文字列以外も含められる
                  ),
  yellow_target : z.preprocess(
                    value => isEmpty(value) ? null : preprocessOneLineString(value),  // `null` とする場合もあるため振り分け
                    z.union([z.enum(boardNodeYellowTargets), z.null()], { error: zodErrorMessages.generalInvalid(yellowTargetDisplayName) })
                  ),
  description   : z.preprocess(
                    preprocessMultiLinesString,
                    z.string({ error: zodErrorMessages.invalidType(descriptionDisplayName) })
                      .min(1, { error: zodErrorMessages.empty(descriptionDisplayName) })
                  ),
  is_unlocked   : z.preprocess(
                    preprocessBooleanNumber,
                    z.union([z.literal(booleanNumberFalse), z.literal(booleanNumberTrue)], { error: zodErrorMessages.booleanNumber(isUnlockedDisplayName) })
                  ),
  amount        : z.preprocess(
                    value => isEmpty(value) ? 0 : value,
                    z.coerce.number({ error: zodErrorMessages.invalidType(amountDisplayName) })
                  ),
  connect_rate  : z.preprocess(
                    value => isEmpty(value) ? null : Number(value),  // `null` を許容する・そのため `z.coerce.number()` でのキャストはせず `Number()` で変換しておく
                    z.number({ error: zodErrorMessages.invalidType(connectRateDisplayName) })
                      .nullish()  // `null`・`undefined`
                  )
}).superRefine((value, context) => {
  if(value.category === boardNodeCategoryYellow && isEmpty(value.yellow_target)) {
    context.addIssue({ code: 'custom', message: zodErrorMessages.empty(yellowTargetDisplayName) });
  }
  if(value.category !== boardNodeCategoryYellow && !isEmpty(value.yellow_target)) {
    context.addIssue({ code: 'custom', message: `${yellowTargetDisplayName}は黄マス以外では指定できません` });
  }
});

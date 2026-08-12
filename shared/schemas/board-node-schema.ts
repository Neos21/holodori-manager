import z from 'zod';

import { preprocessBooleanNumber, preprocessMultiLinesString, preprocessOneLineString } from './schema-utilities';
import { isEmpty } from '../helpers/is-empty';

export const holomemsIdDisplayName  = 'ホロメン ID' as const;
export const categoryDisplayName    = 'カテゴリ' as const;
export const yellowTargetDisplayName = '黄マス対象' as const;
export const descriptionDisplayName = '説明' as const;
export const isUnlockedDisplayName  = '解放状態' as const;
export const amountDisplayName      = '効果量' as const;
export const connectRateDisplayName = 'コネクト率' as const;

const allowedCategories = ['red', 'blue', 'yellow', 'green'] as const;
const allowedYellowTargets = ['lesson_pt', 'cube', 'training'] as const;

export const boardNodeSchema = z.object({
  holomems_id: z.preprocess(
                value => value == null ? 0 : value,
                z.number({ error: `${holomemsIdDisplayName}に数値が指定されていません` })
                  .int({ error: `${holomemsIdDisplayName}には整数を入力してください` })
                  .min(1, { error: `${holomemsIdDisplayName}は1以上で入力してください` })
              ),
  category  : z.preprocess(
                preprocessOneLineString,
                z.enum(allowedCategories, { message: `${categoryDisplayName}は red/blue/yellow/green のいずれかで指定してください` })
              ),
  yellow_target: z.preprocess(
                    value => isEmpty(value) ? null : preprocessOneLineString(value),
                    z.union([z.enum(allowedYellowTargets), z.null()])
                  ),
  description: z.preprocess(
                preprocessMultiLinesString,
                z.string({ error: `${descriptionDisplayName}に文字列でないデータが入力されています` })
                  .min(1, { error: `${descriptionDisplayName}を入力してください` })
              ),
  is_unlocked: z.preprocess(
                preprocessBooleanNumber,
                z.union([z.literal(0), z.literal(1)])
              ),
  amount    : z.preprocess(
                value => value == null ? 0 : value,
                z.number({ error: `${amountDisplayName}に数値が指定されていません` })
              ),
  connect_rate: z.preprocess(
                  value => value == null ? null : value,
                  z.number({ error: `${connectRateDisplayName}に数値でないデータが入力されています` }).nullable()
                )
}).superRefine((value, context) => {
  if(value.category === 'yellow' && isEmpty(value.yellow_target)) {
    context.addIssue({ code: 'custom', message: `${yellowTargetDisplayName}を入力してください` });
  }
  if(value.category !== 'yellow' && !isEmpty(value.yellow_target)) {
    context.addIssue({ code: 'custom', message: `${yellowTargetDisplayName}は yellow 以外では指定できません` });
  }
});

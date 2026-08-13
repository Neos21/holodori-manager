import z from 'zod';

import { preprocessBooleanNumber, preprocessMultiLinesString, preprocessOneLineString, zodErrorMessages } from './schema-utilities';
import { booleanNumberFalse, booleanNumberTrue } from '../constants/boolean-constants';
import { isEmpty } from '../helpers/is-empty';

export const sortOrderDisplayName = '表示順'     as const;
export const groupDisplayName     = 'グループ'   as const;
export const nameDisplayName      = 'タレント名' as const;
export const noteDisplayName      = '自由記入欄' as const;
export const isActiveDisplayName  = '状態'       as const;

export const holomemSchema = z.object({
  sort_order: z.preprocess(
                value => isEmpty(value) ? 0 : value,  // 未入力時は 0 にしてエラー扱いにする
                z.coerce.number({ error: zodErrorMessages.invalidType(sortOrderDisplayName) })
                  .int({ error: zodErrorMessages.integer(sortOrderDisplayName) })
                  .min(1, { error: zodErrorMessages.minimumNumber(sortOrderDisplayName, 1) })
              ),
  group     : z.preprocess(
                preprocessOneLineString,
                z.string({ error: zodErrorMessages.invalidType(groupDisplayName) })
                  .min(1, { error: zodErrorMessages.empty(groupDisplayName) })
              ),
  name      : z.preprocess(
                preprocessOneLineString,
                z.string({ error: zodErrorMessages.invalidType(nameDisplayName) })
                  .min(1, { error: zodErrorMessages.empty(nameDisplayName) })
              ),
  note      : z.preprocess(
                preprocessMultiLinesString,
                z.string({ error: zodErrorMessages.invalidType(noteDisplayName) })
                  .nullish()
              ),
  is_active : z.preprocess(
                preprocessBooleanNumber,
                z.union([z.literal(booleanNumberFalse), z.literal(booleanNumberTrue)], { error: zodErrorMessages.booleanNumber(isActiveDisplayName) })
              )
});

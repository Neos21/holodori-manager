import z from 'zod';

import { preprocessMultiLinesString, zodErrorMessages } from './schema-utilities';
import { isEmpty } from '../helpers/is-empty';

export const holomemsIdDisplayName      = 'ホロメン ID'        as const;
export const currentCountDisplayName    = 'ホロワーク完了回数' as const;
export const achievementNoteDisplayName = '自由記入欄'         as const;

export const holoworkAchievementSchema = z.object({
  holomems_id   : z.preprocess(
                    value => isEmpty(value) ? 0 : value,  // 未入力時は 0 にしてエラー扱いにする
                    z.coerce.number({ error: zodErrorMessages.invalidType(holomemsIdDisplayName) })
                      .int({ error: zodErrorMessages.integer(holomemsIdDisplayName) })
                      .min(1, { error: zodErrorMessages.minimumNumber(holomemsIdDisplayName, 1) })
                  ),
  current_count : z.preprocess(
                    value => isEmpty(value) ? 0 : value,  // 未入力時は 0 回とみなす
                    z.coerce.number({ error: zodErrorMessages.invalidType(currentCountDisplayName) })
                      .int({ error: zodErrorMessages.integer(currentCountDisplayName) })
                      .min(0, { error: zodErrorMessages.minimumNumber(currentCountDisplayName, 0) })
                  ),
  note          : z.preprocess(
                    preprocessMultiLinesString,
                    z.string({ error: zodErrorMessages.invalidType(achievementNoteDisplayName) })
                      .nullish()
                  )
});

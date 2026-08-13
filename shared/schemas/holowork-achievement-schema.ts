import z from 'zod';

import { preprocessMultiLinesString } from './schema-utilities';

export const holomemsIdDisplayName      = 'ホロメン ID'        as const;
export const currentCountDisplayName    = 'ホロワーク完了回数' as const;
export const achievementNoteDisplayName = '自由記入欄'         as const;

export const holoworkAchievementSchema = z.object({
  holomems_id   : z.preprocess(
                    value => value == null ? -1 : value,  // 未入力時は負数にしてエラー扱いにする
                    z.coerce.number({ error: `${holomemsIdDisplayName}に数値が指定されていません` })
                      .int({ error: `${holomemsIdDisplayName}には整数を入力してください` })
                      .min(0, { error: `${holomemsIdDisplayName}は 0 以上で入力してください` })
                  ),
  current_count : z.preprocess(
                    value => value == null ? 0 : value,  // 未入力時は 0 回とみなす
                    z.coerce.number({ error: `${currentCountDisplayName}に数値が指定されていません` })
                      .int({ error: `${currentCountDisplayName}には整数を入力してください` })
                      .min(0, { error: `${currentCountDisplayName}は 0 以上で入力してください` })
                  ),
  note          : z.preprocess(
                    preprocessMultiLinesString,
                    z.string({ error: `${achievementNoteDisplayName}に文字列でないデータが入力されています` })
                      .nullish()
                  )
});

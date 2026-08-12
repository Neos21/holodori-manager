import z from 'zod';

import { preprocessMultiLinesString } from './schema-utilities';

export const holomemIdDisplayName      = 'ホロメン ID' as const;
export const currentCountDisplayName   = '完了回数' as const;
export const achievementNoteDisplayName = '備考' as const;

export const holoworkAchievementSchema = z.object({
  holomems_id: z.preprocess(
                value => value == null ? 0 : value,
                z.number({ error: `${holomemIdDisplayName}に数値が指定されていません` })
                  .int({ error: `${holomemIdDisplayName}には整数を入力してください` })
                  .min(1, { error: `${holomemIdDisplayName}は1以上で入力してください` })
              ),
  current_count: z.preprocess(
                   value => value == null ? 0 : value,
                   z.number({ error: `${currentCountDisplayName}に数値が指定されていません` })
                     .int({ error: `${currentCountDisplayName}には整数を入力してください` })
                     .min(0, { error: `${currentCountDisplayName}は0以上で入力してください` })
                 ),
  note: z.preprocess(
          preprocessMultiLinesString,
          z.string({ error: `${achievementNoteDisplayName}に文字列でないデータが入力されています` })
            .nullish()
        )
});

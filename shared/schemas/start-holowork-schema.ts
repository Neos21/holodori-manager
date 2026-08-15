import z from 'zod';

import { zodErrorMessages } from './schema-utilities';
import { maximumHoloworkMemberCount, minimumHoloworkMemberCount } from '../constants/holodori-constants';

import type { StartHoloworkRequest } from '../types/start-holowork-request';

const holomemsIdsDisplayName = '選択されたメンバー' as const;

/** ホロワーク開始リクエストを検証するためのスキーマ */
export const startHoloworkSchema: z.ZodType<StartHoloworkRequest> = z.object({
  holomems_ids: z.array(
                  z.number({ error: zodErrorMessages.invalidType(holomemsIdsDisplayName) })
                    .int({ error: zodErrorMessages.integer(`${holomemsIdsDisplayName}の ID`) })
                    .min(1, { error: zodErrorMessages.minimumNumber(`${holomemsIdsDisplayName}の ID`, 1) }),
                  { error: `${holomemsIdsDisplayName}は配列で指定してください` }
                )
                .min(minimumHoloworkMemberCount, { error: `${holomemsIdsDisplayName}を ${minimumHoloworkMemberCount} 人以上指定してください` })
                .max(maximumHoloworkMemberCount, { error: `${holomemsIdsDisplayName}は ${maximumHoloworkMemberCount} 人以下で指定してください` })
                .refine(holomemsIds => new Set(holomemsIds).size === holomemsIds.length, { message: `${holomemsIdsDisplayName}に同じホロメンは指定できません` })
});

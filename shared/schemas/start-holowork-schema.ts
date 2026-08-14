import z from 'zod';

import { zodErrorMessages } from './schema-utilities';

import type { StartHoloworkRequest } from '../types/start-holowork-request';

const holomemsIdsDisplayName = '選択されたメンバー' as const;

/** ホロワーク開始リクエストを検証するためのスキーマ */
export const startHoloworkSchema: z.ZodType<StartHoloworkRequest> = z.object({
  holomems_ids: z.array(
                  z.number({ error: zodErrorMessages.invalidType(holomemsIdsDisplayName) })
                    .int({ error: `${holomemsIdsDisplayName}の ID には整数を指定してください` })
                    .min(1, { error: `${holomemsIdsDisplayName}の ID には正の整数を指定してください` }),
                  { error: `${holomemsIdsDisplayName}は配列で指定してください` }
                )
                .min(1, { error: `${holomemsIdsDisplayName}を1件以上指定してください` })
                .max(5, { error: `${holomemsIdsDisplayName}は5件以下で指定してください` })
                .refine(holomemsIds => new Set(holomemsIds).size === holomemsIds.length, { message: `${holomemsIdsDisplayName}に同じ ID は指定できません` })
});

import { blooms, rarities } from '../constants/holodori-constants';

import type { BooleanNumber } from './boolean-types';

/** レア度の型 */
export type Rarity = (typeof rarities)[number];
/** 開花度の型 */
export type Bloom = (typeof blooms)[number];

/** カード */
export type Card = {
  /** ID */
  id: number;
  /** ホロメン ID */
  holomems_id: number;
  /** レア度 */
  rarity: Rarity;
  /** カード名称 (通常版・イベント限定版などの識別に使用する) */
  name: string;
  /** 所有しているか否か */
  is_owned: BooleanNumber;
  /** レベル */
  level: number;
  /** 開花度 */
  bloom: Bloom;
};

/** フロントエンド表示用の型 */
export type CardDisplay = Card & {
  /** グループ (`holomems.group_name`) */
  holomem_group_name: string;
  /** タレント名 (`holomems.name`) */
  holomem_name: string;
};

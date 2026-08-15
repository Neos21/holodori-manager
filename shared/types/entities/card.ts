import type { Bloom, Rarity } from '../holodori/card-types';
import type { BooleanNumber } from '../utilities/boolean-types';

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

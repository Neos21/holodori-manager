import type { Card } from '../entities/card';

/** フロントエンド表示用の型 */
export type CardDisplay = Card & {
  /** グループ (`holomems.group_name`) */
  holomem_group_name: string;
  /** タレント名 (`holomems.name`) */
  holomem_name: string;
};

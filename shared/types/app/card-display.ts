import type { Card } from '../entities/card';

/** カード管理ページで、カードに紐づくホロメンの表示情報を併記するための型 */
export type CardDisplay = Card & {
  /** グループ (`holomems.group_name`) */
  holomem_group_name: string;
  /** タレント名 (`holomems.name`) */
  holomem_name: string;
};

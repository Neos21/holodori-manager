import type { Holowork } from './holowork';

/** 活動中メンバーを含む画面表示用のホロワーク枠 */
export type HoloworkDisplay = Holowork & {
  /** 活動中メンバー */
  active_members: Array<{
    /** ホロメン ID (`holomems.id`) */
    holomems_id: number;
    /** ホロメン表示順 (`holomems.sort_order`) */
    holomems_sort_order: number;
    /** グループ (`holomems.group_name`) */
    holomems_group_name: string;
    /** タレント名 (`holomems.name`) */
    holomems_name: string;
  }>;
};

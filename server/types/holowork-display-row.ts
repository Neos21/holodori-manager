/** ホロワーク枠表示用 SQL の1行を表す内部型 */
export type HoloworkDisplayRow = {
  /** ID */
  id: number;
  /** 枠の名前 */
  name: string;
  /** ホロメン ID (`holomems.id`) */
  holomems_id: number | null;
  /** ホロメン表示順 (`holomems.sort_order`) */
  holomems_sort_order: number | null;
  /** グループ (`holomems.group_name`) */
  holomems_group_name: string | null;
  /** タレント名 (`holomems.name`) */
  holomems_name: string | null;
};

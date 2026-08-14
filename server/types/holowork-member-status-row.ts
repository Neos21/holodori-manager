import type { BoardNodeYellowTarget } from '../../shared/types/app-types';

/** ホロメン別ステータス取得 SQL の1行を表す内部型 */
export type HoloworkMemberStatusRow = {
  /** ホロメン ID (`holomems.id`) */
  holomems_id: number;
  /** ホロメン表示順 (`holomems.sort_order`) */
  holomems_sort_order: number;
  /** グループ (`holomems.group_name`) */
  holomems_group_name: string;
  /** タレント名 (`holomems.name`) */
  holomems_name: string;
  /** ホロワーク達成状況 ID (`holowork_achievements.id`) */
  holowork_achievements_id: number;
  /** 現在のホロワーク完了回数 */
  current_count: number;
  /** ホロワーク達成状況の自由記入欄 (`holowork_achievements.note`) */
  achievement_note: string | null | undefined;
  /** 活動中のホロワーク ID・非活動中の場合は `null` */
  active_holoworks_id: number | null;
  /** 活動中のホロワーク名・非活動中の場合は `null` */
  active_holoworks_name: string | null;
  /** 黃マスの場合のホロワーク報酬アップ対象アイテム・その他の場合は `null` */
  yellow_target: BoardNodeYellowTarget | null;
  /** 基礎効果量 */
  amount: number | null;
  /** コネクトマスによる増幅率 (%) */
  connect_rate: number | null;
};

/** ホロメン別のホロワーク達成状況・黄マス情報 */
export type HoloworkMemberStatus = {
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
  /** 次に達成すべきアチーブメント閾値・全達成済みの場合は `null` */
  next_threshold: number | null;
  /** 次のアチーブメントまでに必要な残り回数・全達成済みの場合は `null` */
  remaining_count: number | null;
  /** ホロワーク達成状況の自由記入欄 (`holowork_achievements.note`) */
  achievement_note: string | null | undefined;
  /** 活動中のホロワーク ID・非活動中の場合は `null` */
  active_holoworks_id: number | null;
  /** 活動中のホロワーク名・非活動中の場合は `null` */
  active_holoworks_name: string | null;
  /** キューブ獲得アップ量の合計最終レート */
  cube_total_rate: number;
  /** 特訓アイテム獲得アップ量の合計最終レート */
  training_total_rate: number;
  /** レッスン Pt 獲得アップ量の合計最終レート */
  lesson_pt_total_rate: number;
};

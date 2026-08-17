import type { HoloworkAchievementProgress } from './holowork-achievement-progress';
import type { HoloworkMember } from './holowork-display';

/** ホロメン別のホロワーク達成状況・活動状況・黄マス情報 */
export type HoloworkMemberStatus = HoloworkMember & HoloworkAchievementProgress & {
  /** ホロワーク達成状況 ID (`holowork_achievements.id`) */
  holowork_achievements_id: number;
  /** 現在のホロワーク完了回数 */
  current_count: number;
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

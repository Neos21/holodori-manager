/** ホロワーク達成状況 */
export type HoloworkAchievement = {
  /** ID */
  id: number;
  /** ホロメン ID */
  holomems_id: number;
  /** ホロワーク完了回数 */
  current_count: number;
  /** 自由記入欄 */
  note: string | null | undefined;
};

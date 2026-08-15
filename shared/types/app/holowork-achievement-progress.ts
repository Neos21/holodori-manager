/** ホロワーク完了回数のアチーブメント進捗 */
export type HoloworkAchievementProgress = {
  /** 次に達成すべきアチーブメント閾値・全達成済みの場合は `null` */
  next_threshold: number | null;
  /** 次のアチーブメントまでに必要な残り回数・全達成済みの場合は `null` */
  remaining_count: number | null;
};

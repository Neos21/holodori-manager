/** ホロワーク達成状況 */
export type HoloworkAchievement = {
  /** ID */
  id: number;
  /** ホロメン ID */
  holomems_id: number;
  /** ホロワーク完了回数 */
  current_count: number;
  /** 自由記入欄・DB 上の未設定値は `null`、部分更新で項目を更新対象に含めない場合は `undefined` */
  note: string | null | undefined;
};

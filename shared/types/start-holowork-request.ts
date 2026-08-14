/** ホロワーク開始リクエスト */
export type StartHoloworkRequest = {
  /** 開始するホロメン ID・1件以上5件以下 */
  holomems_ids: Array<number>;
};

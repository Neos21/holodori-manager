/** API レスポンスの候補レコード。ホロワーク管理画面の候補表示用。 */
export type HoloworkCountCandidate = {
  /** ホロメン ID (`holomems.id`) */
  holomems_id: number;
  /** ホロメン名 (`holomems.name`) */
  holomems_name: string;
  /** ホローワーク達成状況の自由記入欄 (`holomems.note`) */
  holomems_note: string | null | undefined;
  /** 現在のホロワーク完了回数 (`holowork_achievements.current_count`) */
  current_count: number;
  /** 次に達成すべきアチーブメント閾値。400 以上の場合は `null` */
  next_threshold: number | null;
  /** 次のアチーブメントまでに必要な残り回数。400 以上の場合は `null` */
  remaining_count: number | null;
};

export type HoloworkRateCandidate = {
  /** ホロメン ID (`holomems.id`) */
  holomems_id: number;
  /** ホロメン名 (`holomems.name`) */
  holomems_name: string;
  /** ホローワーク達成状況の自由記入欄 (`holomems.note`) */
  holomems_note: string | null | undefined;
  /** 選択 priority の合計最終レート (`board_nodes.amount` と `board_nodes.connect_rate` を計算した「最終レート」の合算値) */
  total_rate: number;
};

export type HoloworkCandidate = HoloworkCountCandidate | HoloworkRateCandidate;

export type HoloworkCandidates = {
  /** 選択された優先度 */
  selected_priority: 'count' | 'lesson_pt' | 'cube' | 'training';
  /** 候補一覧 */
  candidates: Array<HoloworkCandidate>;
};

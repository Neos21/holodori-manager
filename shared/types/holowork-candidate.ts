import type { CandidatePriority } from './app-types';

/** ホロワーク候補者の共通項目 */
type HoloworkCandidateBase = {
  /** ホロメン ID (`holomems.id`) */
  holomems_id: number;
  /** ホロメン表示順 (`holomems.sort_order`) */
  holomems_sort_order: number;
  /** グループ (`holomems.group_name`) */
  holomems_group_name: string;
  /** タレント名 (`holomems.name`) */
  holomems_name: string;
  /** ホロワーク達成状況の自由記入欄 (`holowork_achievements.note`) */
  achievement_note: string | null | undefined;
};

/** 完了回数重視を選択した場合の候補者1人を表現した型 */
export type HoloworkCountCandidate = HoloworkCandidateBase & {
  /** 現在のホロワーク完了回数 (`holowork_achievements.current_count`) */
  current_count: number;
  /** 次に達成すべきアチーブメント閾値・最大回数以上になっている場合は `null` */
  next_threshold: number | null;
  /** 次のアチーブメントまでに必要な残り回数・最大回数以上になっている場合は `null` */
  remaining_count: number | null;
};

/** アイテム獲得量重視を選択した場合の候補者1人を表現した型 */
export type HoloworkRateCandidate = HoloworkCandidateBase & {
  /** 選択した Priority に対する合計最終レート (`board_nodes.amount` と `board_nodes.connect_rate` を計算した「最終レート」の合算値) */
  total_rate: number;
};

/** ホロワークで優先的に選択すべき候補者を表現した型 */
export type HoloworkCandidate = HoloworkCountCandidate | HoloworkRateCandidate;

/** ホロワークで優先的に選択すべき候補者を示す型 */
export type HoloworkCandidates = {
  /** 選択された優先度 */
  selected_priority: CandidatePriority;
  /** 選択した優先モードの条件を満たす候補一覧 */
  priority_candidates: Array<HoloworkCandidate>;
  /** 優先条件を満たさない選択可能な候補一覧 */
  other_candidates: Array<HoloworkCandidate>;
};

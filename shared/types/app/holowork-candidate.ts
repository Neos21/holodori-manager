import type { HoloworkAchievementProgress } from './holowork-achievement-progress';
import type { HoloworkMemberWithAchievementNote } from './holowork-display';
import type { candidatePriorities } from '../../constants/app-constants';

/** ホロワーク優先モードの全選択肢を示す型 */
export type CandidatePriority = typeof candidatePriorities[number];

/** 優先モードにかかわらず候補者レスポンスに含める共通項目 */
export type HoloworkCandidateBase = HoloworkMemberWithAchievementNote;

/** 完了回数重視を選択した場合の候補者1人を表現した型 */
export type HoloworkCountCandidate = HoloworkCandidateBase & {
  /** 現在のホロワーク完了回数 (`holowork_achievements.current_count`) */
  current_count: number;
} & HoloworkAchievementProgress;

/** アイテム獲得量重視を選択した場合の候補者1人を表現した型 */
export type HoloworkRateCandidate = HoloworkCandidateBase & {
  /** 選択した Priority に対する合計最終レート (`board_nodes.amount` と `board_nodes.connect_rate` を計算した「最終レート」の合算値) */
  total_rate: number;
};

/** 選択可能なホロワーク候補者・優先モードに応じて比較情報が異なる */
export type HoloworkCandidate = HoloworkCountCandidate | HoloworkRateCandidate;

/** 選択可能な候補者を優先条件への合致有無で排他的に分けたレスポンス */
export type HoloworkCandidates = {
  /** 候補選定に使用した優先モード */
  selected_priority: CandidatePriority;
  /** 選択した優先モードの条件を満たす候補一覧 */
  priority_candidates: Array<HoloworkCandidate>;
  /** 優先条件を満たさない選択可能な候補一覧 */
  other_candidates: Array<HoloworkCandidate>;
};

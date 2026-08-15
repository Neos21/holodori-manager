import type { HoloworkCandidateBase, HoloworkCountCandidate } from '../../shared/types/app/holowork-candidate';
import type { BoardNodeYellowTarget } from '../../shared/types/holodori/board-node-types';

/**
 * 完了回数重視の候補取得 SQL の1行・進捗計算前なので現在回数までを保持する
 * 
 * @see {@link HoloworkCountCandidate} 集約後の型
 */
export type HoloworkCountCandidateRow = HoloworkCandidateBase & Pick<HoloworkCountCandidate, 'current_count'>;

/**
 * アイテム獲得量重視の候補取得 SQL の1行・黄マス1件ごとに同じホロメンが複数行になりうる
 * 
 * @see {@link HoloworkRateCandidate} 集約後の型
 */
export type HoloworkRateCandidateRow = HoloworkCandidateBase & {
  /** 黃マスの場合のホロワーク報酬アップ対象アイテム・その他の場合は `null` */
  yellow_target: BoardNodeYellowTarget | null;
  /** 基礎効果量 */
  amount: number | null;
  /** コネクトマスによる増幅率 (%) */
  connect_rate : number | null;
};

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
  /** ホロワーク報酬アップ対象アイテム・該当する解放済み黄マスがない場合は `null` */
  yellow_target: BoardNodeYellowTarget | null;
  /** 基礎効果量・該当する解放済み黄マスがない場合は `null` */
  amount: number | null;
  /** コネクトマスによる増幅率 (%)・黄マスがない、または増幅率が未設定の場合は `null` */
  connect_rate : number | null;
};

import type { HoloworkMemberWithAchievementNote } from '../../shared/types/app/holowork-display';
import type { HoloworkMemberStatus } from '../../shared/types/app/holowork-member-status';
import type { BoardNodeYellowTarget } from '../../shared/types/holodori/board-node-types';

/** ホロメン別ステータスの SQL 行とフロントエンド用モデルで値が一致する項目 */
type HoloworkMemberStatusBaseRow = HoloworkMemberWithAchievementNote & Pick<HoloworkMemberStatus, 'holowork_achievements_id' | 'current_count' | 'active_holoworks_id' | 'active_holoworks_name'>;

/**
 * ホロメン別ステータス取得 SQL の1行を表す内部型
 * 
 * SQL 行は黄マス1件ごとに重複し、進捗と合計レートも未計算であるため、集約・計算済みの `HoloworkMemberStatus` とは分けて扱う
 * 
 * @see {@link HoloworkMemberStatus} フロントエンドで使用する集約・計算済みの型
 */
export type HoloworkMemberStatusRow = HoloworkMemberStatusBaseRow & {
  /** ホロワーク報酬アップ対象アイテム・該当する解放済み黄マスがない場合は `null` */
  yellow_target: BoardNodeYellowTarget | null;
  /** 基礎効果量・該当する解放済み黄マスがない場合は `null` */
  amount: number | null;
  /** コネクトマスによる増幅率 (%)・黄マスがない、または増幅率が未設定の場合は `null` */
  connect_rate: number | null;
};

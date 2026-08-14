import type { BoardNodeYellowTarget } from '../../shared/types/app-types';
import type { HoloworkMemberWithAchievementNote } from '../../shared/types/holowork';
import type { HoloworkMemberStatus } from '../../shared/types/holowork-member-status';

/** ホロメン別ステータスの SQL 行とフロントエンド用モデルで値が一致する項目 */
type HoloworkMemberStatusBaseRow = HoloworkMemberWithAchievementNote & Pick<HoloworkMemberStatus, 'holowork_achievements_id' | 'current_count' | 'active_holoworks_id' | 'active_holoworks_name'>;

/**
 * ホロメン別ステータス取得 SQL の1行を表す内部型
 * 
 * SQL 行は黄マス1件ごとに重複し、進捗と合計レートも未計算であるため
 * 集約・計算済みの `HoloworkMemberStatus` とは分けて扱う
 * 
 * @see {@link HoloworkMemberStatus} 集約・計算済みのデータを表現する型・コチラをフロントエンドで使用する
 */
export type HoloworkMemberStatusRow = HoloworkMemberStatusBaseRow & {
  /** 黃マスの場合のホロワーク報酬アップ対象アイテム・その他の場合は `null` */
  yellow_target: BoardNodeYellowTarget | null;
  /** 基礎効果量 */
  amount: number | null;
  /** コネクトマスによる増幅率 (%) */
  connect_rate: number | null;
};

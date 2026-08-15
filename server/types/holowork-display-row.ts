import type { HoloworkMember } from '../../shared/types/app/holowork-display';
import type { Holowork } from '../../shared/types/entities/holowork';

/** `LEFT JOIN` でメンバーが存在しない枠も取得するため、ホロメン基本情報を Nullable にした型 */
type NullableHoloworkMember = { [Property in keyof HoloworkMember]: HoloworkMember[Property] | null; };

/**
 * ホロワーク枠表示用 SQL の1行を表す内部型
 * 
 * 1行に最大1人しか含まれない SQL 結果を Service が枠単位に集約して `HoloworkDisplay` を作るため、配列を持つフロントエンド用モデルとは分けて扱う
 * 
 * @see {@link HoloworkDisplay} フロントエンドで使用する集約済みの型
 */
export type HoloworkDisplayRow = Holowork & NullableHoloworkMember;

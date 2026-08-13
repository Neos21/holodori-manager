import type { BoardNodeYellowTarget } from './app-types';
import type { BooleanNumber } from './boolean-types';
import type { BoardNodeCategory } from './holodori-types';

/** ホロメンボードのマス */
export type BoardNode = {
  /** ID */
  id: number;
  /** ホロメン ID */
  holomems_id: number;
  /** カテゴリ */
  category: BoardNodeCategory;
  /** category = yellow の時のみホロワーク報酬アップ対象のアイテムを示す・その他の場合は `null` */
  yellow_target: BoardNodeYellowTarget | null;
  /** マス効果の内容 */
  description: string;
  /** 対象のマスを解放済か否か */
  is_unlocked: BooleanNumber;
  /** マス自体の基礎効果量 (% の場合もあれば固定値の場合もあるため単位非依存の数値として保持する) */
  amount: number;
  /** コネクトマスによる増幅率 (%)。未設定なら `null` */
  connect_rate: number | null;
};

/** フロントエンド表示用の型 */
export type BoardNodeDisplay = BoardNode & {
  /** グループ (`holomems.group`) */
  holomem_group: string;
  /** タレント名 (`holomems.name`) */
  holomem_name: string;
  /** 自由記入欄 (`holomems.note`) */
  holomem_note: string | null | undefined;
};

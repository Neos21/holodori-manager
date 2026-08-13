import type { BooleanNumber } from './type-utilities';

/** ホロメンボードのマス */
export type BoardNode = {
  /** ID */
  id: number;
  /** ホロメン ID */
  holomems_id: number;
  /** カテゴリ */
  category: 'red' | 'blue' | 'yellow' | 'green';  // TODO : 共通化
  /** category = yellow の時のみホロワーク報酬アップ対象のアイテムを示す・その他の場合は `null` */
  yellow_target: 'lesson_pt' | 'cube' | 'training' | null;  // TODO : 共通化
  /** マス効果の内容 */
  description: string;
  /** 対象のマスを解放済か否か */
  is_unlocked: BooleanNumber;
  /** マス自体の基礎効果量 (% の場合もあれば固定値の場合もあるため単位非依存の数値として保持する) */
  amount: number;
  /** コネクトマスによる増幅率 (%)。未設定なら `null` */
  connect_rate: number | null;
};

import type { BooleanNumber } from '../utilities/boolean-types';

/** ホロメン */
export type Holomem = {
  /** ID */
  id: number;
  /** ゲーム内表示順を再現するための手動調整可能な表示順 */
  sort_order: number;
  /** グループ */
  group_name: string;
  /** タレント名 */
  name: string;
  /** 自由記入欄・DB 上の未設定値は `null`、部分更新で項目を更新対象に含めない場合は `undefined` */
  note: string | null | undefined;
  /** 卒業等による無効化 (False にすると無効)・物理削除はしない */
  is_active: BooleanNumber;
};

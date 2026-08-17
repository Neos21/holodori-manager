import type { Holowork } from '../entities/holowork';

/** ホロワーク管理ページの表示・候補選択で共通して参照するホロメン基本情報とメモ */
export type HoloworkMember = {
  /** ホロメン ID (`holomems.id`) */
  holomems_id: number;
  /** ホロメン表示順 (`holomems.sort_order`) */
  holomems_sort_order: number;
  /** グループ (`holomems.group_name`) */
  holomems_group_name: string;
  /** タレント名 (`holomems.name`) */
  holomems_name: string;
  /** ホロメンの自由記入欄 (`holomems.note`)・未設定の場合は `null` または `undefined` */
  holomems_note: string | null | undefined;
};

/** 活動中メンバーを含むフロントエンド表示用のホロワーク枠 */
export type HoloworkDisplay = Holowork & {
  /** 活動中メンバー・いない場合は空配列 */
  active_members: Array<HoloworkMember>;
};

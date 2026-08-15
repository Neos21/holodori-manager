/** 自由メモ : 現状は単一レコード運用を想定している */
export type Memo = {
  /** ID */
  id: number;
  /** 自由メモ・DB 上の未設定値は `null`、保存時に本文を指定しない場合は `undefined` */
  content: string | null | undefined;
};

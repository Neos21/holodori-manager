/** 自由メモ : 現状は単一レコード運用を想定している */
export type Memo = {
  /** ID */
  id: number;
  /** 自由メモ */
  content: string | null | undefined;
};

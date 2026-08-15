/** `undefined`・`null`、または文字列化して Trim した結果が空なら True と判定する */
export const isEmpty = (value: unknown): boolean => value == null || value === '' || String(value).trim().length === 0;

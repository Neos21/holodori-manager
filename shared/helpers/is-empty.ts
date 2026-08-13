/** `undefined`・`null`・Trim して空文字なら True と判定する */
export const isEmpty = (value: unknown): boolean => value == null || value === '' || String(value).trim().length === 0;

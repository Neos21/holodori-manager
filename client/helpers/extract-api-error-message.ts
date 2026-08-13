import { isEmpty } from '../../shared/helpers/is-empty';

/** `ky` の例外オブジェクトから API のレスポンスオブジェクトのトップレベルにある `error` プロパティ (API が返したエラーメッセージ) を取得する・取得できなかった場合は指定のデフォルトエラーメッセージを返す */
export const extractApiErrorMessage = (error: any, defaultMessage: string): string => isEmpty(error?.data?.error) ? defaultMessage : error.data.error;  // eslint-disable-line @typescript-eslint/no-explicit-any

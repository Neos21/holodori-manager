import { isEmpty } from '../../shared/helpers/is-empty';

/** `ky` の例外オブジェクトから API のレスポンスオブジェクトのトップレベルにある `error` プロパティ (API が返したエラーメッセージ) を取得する・取得できなかった場合は指定のデフォルトエラーメッセージを返す */
export const extractApiErrorMessage = (error: unknown, defaultMessage: string): string => {
  if(error == null || typeof error !== 'object' || !('data' in error)) return defaultMessage;
  const data = error.data;
  if(data == null || typeof data !== 'object' || !('error' in data)) return defaultMessage;
  const errorMessage = data.error;
  return typeof errorMessage !== 'string' || isEmpty(errorMessage) ? defaultMessage : errorMessage;
};

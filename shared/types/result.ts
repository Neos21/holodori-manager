/** 例外を使用せず正常系・異常系を表現するための型 */
export type Result<T> = { result: T; error?: undefined; httpStatusCode?: undefined; } | { result?: undefined; error: string; httpStatusCode?: number; };

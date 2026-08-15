/** リソースの取得に失敗した場合のメッセージ */
export const failedToFetchMessage  = (resourceName: string): string => `${resourceName}の取得に失敗しました`;
/** リソースの追加に失敗した場合のメッセージ */
export const failedToCreateMessage = (resourceName: string): string => `${resourceName}の追加に失敗しました`;
/** リソースの更新に失敗した場合のメッセージ */
export const failedToUpdateMessage = (resourceName: string): string => `${resourceName}の更新に失敗しました`;
/** リソースの削除に失敗した場合のメッセージ */
export const failedToDeleteMessage = (resourceName: string): string => `${resourceName}の削除に失敗しました`;
/** 任意の処理に失敗した場合のメッセージ */
export const generalFailedMessage  = (actionName: string): string => `${actionName}に失敗しました`;

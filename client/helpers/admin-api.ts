import ky from 'ky';

import { httpStatusCode } from '../../shared/constants/http-status-code';
import { isEmpty } from '../../shared/helpers/is-empty';
import { useAdminStore } from '../stores/admin-store';

/**
 * ログイン後の API コール時に JWT を付与するヘルパー
 * 
 * リクエストやレスポンスが不正な場合は JWT 有効期限切れと判断してログアウト状態にする
 * Store から JWT を削除すると `root.tsx` 内の `useEffect` がそれを検知して適宜リダイレクトなどを行ってくれる
 */
export const adminApi = ky.extend({
  hooks: {
    beforeRequest: [({ request }): void => {
      const token = useAdminStore.getState().token;
      if(isEmpty(token)) return useAdminStore.getState().logout();
      request.headers.set('Authorization', `Bearer ${token}`);
    }],
    afterResponse: [({ response }): void => {
      if(response.status === httpStatusCode.unauthorized) return useAdminStore.getState().logout();
    }]
  }
});

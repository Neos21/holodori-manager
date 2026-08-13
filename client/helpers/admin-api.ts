import ky from 'ky';

import { httpStatusCode } from '../../shared/constants/http-status-code';
import { isEmpty } from '../../shared/helpers/is-empty';
import { useAdminStore } from '../stores/admin-store';

/** ログイン後の API コール時に JWT を付与するヘルパー・リクエストやレスポンスが不正な場合は JWT 有効期限切れと判断してログアウト状態にしてトップページに遷移させる */
export const adminApi = ky.extend({
  hooks: {
    beforeRequest: [({ request }): void => {
      const token = useAdminStore.getState().token;
      if(isEmpty(token)) {
        useAdminStore.getState().logout();
        window.location.href = '/';
        return;
      }
      request.headers.set('Authorization', `Bearer ${token}`);
    }],
    afterResponse: [({ response }): void => {
      if(response.status === httpStatusCode.unauthorized) {
        useAdminStore.getState().logout();
        window.location.href = '/';
        return;
      }
    }]
  }
});

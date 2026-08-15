import ky from 'ky';
import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { loginSchema } from '../../../shared/schemas/login-schema';
import { authenticationRedirectReasonReloginRequired, sessionStorageKeyAuthenticationRedirectReason } from '../../constants/client-constants';
import { generalFailedMessage } from '../../constants/client-messages';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useAdminStore } from '../../stores/admin-store';

export default function Index(): ReactElement {
  const navigate = useNavigate();
  
  const [shouldRequestRelogin] = useState<boolean>(sessionStorage.getItem(sessionStorageKeyAuthenticationRedirectReason) === authenticationRedirectReasonReloginRequired);  // SessionStorage に再ログイン要求があった場合のみ現在の表示中にメッセージを表示する
  
  // 再ログインメッセージの表示有無にかかわらず、表示要求を次回のトップページ表示に持ち越さない
  useEffect((): void => {
    sessionStorage.removeItem(sessionStorageKeyAuthenticationRedirectReason);
  }, []);
  
  const [password    , setPassword    ] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  /** パスワード入力時・同時にエラーメッセージも適宜削除する */
  const onChangePassword = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
    if(!isEmpty(errorMessage)) setErrorMessage('');
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const payload = { password };
    const parsed = loginSchema.safeParse(payload);
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      const response = await ky.post('/api/login', { json: parsed.data }).json<{ result: { token: string; }; }>();
      useAdminStore.getState().setToken(response.result.token);
      navigate('/home');
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, generalFailedMessage('ログイン')));
      setIsSubmitting(false);
    }
  };
  
  return (
    <main className="m-4">
      <h1>Holodori Manager</h1>
      
      {shouldRequestRelogin && (
        <div className="alert alert-warning alert-soft mb-4">再度ログインしてください</div>
      )}
      
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="password" value={password} onChange={onChangePassword} disabled={isSubmitting}
          className="input w-full" placeholder="Password"
          autoComplete="current-password"
        />
        
        {!isEmpty(errorMessage) && (
          <div className="alert alert-error alert-soft">{errorMessage}</div>
        )}
        
        <button
          type="submit" disabled={isSubmitting || isEmpty(password)}
          className="btn"
        >Login</button>
      </form>
    </main>
  );
}

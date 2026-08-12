import ky from 'ky';
import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { loginSchema } from '../../../shared/schemas/login-schema';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useAdminStore } from '../../stores/admin-store';

export default function Index(): ReactElement {
  const navigate = useNavigate();
  
  const [password    , setPassword    ] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
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
      setErrorMessage(extractApiErrorMessage(error, 'ログインに失敗しました'));
      setIsSubmitting(false);
    }
  };
  
  return (
    <main>
      <h1>ログイン</h1>
      
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={password}
          onChange={onChange}
          placeholder="Password"
          autoComplete="current-password"
          disabled={isSubmitting}
        />
        
        {errorMessage && (
          <div className="alert-danger">{errorMessage}</div>
        )}
        
        <button type="submit" disabled={isSubmitting}>Login</button>
      </form>
    </main>
  );
}

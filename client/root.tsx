import { type ReactElement, type ReactNode, useEffect } from 'react';
import { isRouteErrorResponse, Link, Links, Outlet, Scripts, ScrollRestoration, useLocation, useNavigate } from 'react-router';

import { useAdminStore } from './stores/admin-store';
import { authenticationRedirectReasonLogout, authenticationRedirectReasonReloginRequired, sessionStorageKeyAuthenticationRedirectReason } from '../shared/constants/app-constants';
import { isEmpty } from '../shared/helpers/is-empty';

import type { Route } from './+types/root';

import './styles.css';

export function Layout({ children }: { children: ReactNode }): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isHydrated = useAdminStore(state => state.isHydrated);
  const token      = useAdminStore(state => state.token);
  
  // JWT の有無でログイン済か否かをチェックし適宜リダイレクトする
  useEffect((): void => {
    if(isHydrated !== true) return;  // LocalStorage から Store の復旧が済んでいない段階では何もしない
    
    const isAuthenticated = !isEmpty(token);
    
    if(isAuthenticated && location.pathname === '/') {  // ログイン済の場合は `/home` に移動する
      navigate('/home', { replace: true });
      return;
    }
    if(!isAuthenticated && location.pathname !== '/') {  // 未ログインの場合に `/` 以外にいる場合は `/` に移動する
      // JWT 有効期限切れ等の理由の場合は `index.tsx` にメッセージを表示するため、必要に応じて SessionStorage に情報を記録してから遷移する
      const redirectReason = sessionStorage.getItem(sessionStorageKeyAuthenticationRedirectReason);
      if(redirectReason !== authenticationRedirectReasonLogout) sessionStorage.setItem(sessionStorageKeyAuthenticationRedirectReason, authenticationRedirectReasonReloginRequired);
      navigate('/', { replace: true });
      return;
    }
  }, [location.pathname, navigate, isHydrated, token]);
  
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>Holodori Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0088ff" />
        <meta name="description" content="Holodori Manager" />
        <meta name="keywords" content="Holodori Manager" />
        <meta name="robots" content="index, follow" />
        
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Holodori Manager" />
        <meta property="og:title" content="Holodori Manager" />
        <meta property="og:description" content="Holodori Manager" />
        <meta property="og:url" content="https://holodori-manager.neos21.workers.dev" />
        <meta property="og:image" content="https://holodori-manager.neos21.workers.dev/icon-512.png" />
        <meta property="og:locale" content="ja_JP" />
        
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Holodori Manager" />
        <meta property="twitter:description" content="Holodori Manager" />
        <meta property="twitter:url" content="https://holodori-manager.neos21.workers.dev" />
        <meta property="twitter:image" content="https://holodori-manager.neos21.workers.dev/icon-512.png" />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        
        <link rel="author" href="http://www.hatena.ne.jp/neos21/" />
        
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App(): ReactElement {
  return (<Outlet />);
}

export function HydrateFallback(): ReactElement {
  return (<></>);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps): ReactElement {
  let title = 'エラー';
  let text = 'エラーが発生しました';
  if(isRouteErrorResponse(error)) {
    if(error.status === 404) {
      title = '404';
      text  = 'ページが見つかりませんでした';
    }
    if(!isEmpty(error.statusText)) text = error.statusText;
  }
  
  return (
    <main className="alert alert-error alert-soft alert-vertical my-4 mx-3">
      <h1>{title}</h1>
      <p>{text}</p>
      
      <p><Link to="/" className="hover:underline">トップに戻る</Link></p>
    </main>
  );
}

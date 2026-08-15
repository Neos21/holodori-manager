import { type ChangeEvent, type ReactElement, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';

import { Memo } from './components/memo';
import { authenticationRedirectReasonLogout, sessionStorageKeyAuthenticationRedirectReason } from '../constants/client-constants';
import { useAdminStore } from '../stores/admin-store';
import { useHolomemsStore } from '../stores/holomems-store';

/** ログイン後の全画面共通のレイアウト */
export default function AdminLayout(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  const menuItems = [
    { to: '/home'       , label: 'ホーム'         },
    { to: '/holomems'   , label: 'ホロメン'       },
    { to: '/cards'      , label: 'カード'         },
    { to: '/board-nodes', label: 'ホロメンボード' },
    { to: '/holoworks'  , label: 'ホロワーク'     }
  ];
  
  /** サイドメニューを開閉する */
  const onChangeSidebar = (event: ChangeEvent<HTMLInputElement>): void => setIsSidebarOpen(event.target.checked);
  /** サイドメニューのリンクを押下した時にサイドメニューを閉じるためのイベント */
  const onCloseSidebar = (): void => setIsSidebarOpen(false);
  
  /** ユーザ操作によるログアウト理由を記録してから JWT を削除し、トップページに遷移する */
  const onLogout = (): void => {
    sessionStorage.setItem(sessionStorageKeyAuthenticationRedirectReason, authenticationRedirectReasonLogout);
    useAdminStore.getState().logout();
    useHolomemsStore.getState().clearHolomems();
    navigate('/', { replace: true });
  };
  
  return (
    <div className="drawer lg:drawer-open min-h-screen">
      {/* サイドメニュー開閉を操作するための非表示チェックボックス */}
      <input id="admin-sidebar" type="checkbox" className="drawer-toggle" checked={isSidebarOpen} onChange={onChangeSidebar} />
      
      <div className="drawer-content">
        {/* スマホサイズ時のみ表示されるハンバーガーメニューとヘッダラベル */}
        <header className="navbar bg-base-100 shadow-sm lg:hidden">
          <div className="flex-none">
            <label htmlFor="admin-sidebar" className="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>
          <Link to="/home" className="ml-2 flex-1 text-lg font-bold">Holodori Manager</Link>
        </header>
        
        {/* コンテンツ部分 */}
        <div className="min-h-screen py-4 px-3">
          <Outlet />
        </div>
      </div>
      
      <div className="drawer-side">
        {/* スマホサイズでサイドメニューを開いた際に表示されるバックドロップ */}
        <label htmlFor="admin-sidebar" className="drawer-overlay" />
        
        {/* サイドメニュー */}
        <aside className="w-72 min-h-full border-r border-base-300 py-4 px-3 text-base-content bg-base-200">
          <div className="mb-6 text-xl font-bold">Holodori Manager</div>
          <nav className="mb-6">
            <ul className="menu w-full p-0 gap-2">
              {menuItems.map(item => {
                const isActive = location.pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link to={item.to} className={isActive ? 'menu-active font-bold' : ''} onClick={onCloseSidebar}>{item.label}</Link>
                  </li>
                );
              })}
              <li><button type="button" onClick={onLogout}>ログアウト</button></li>
            </ul>
          </nav>
          
          {/* 自由メモ */}
          <Memo />
        </aside>
      </div>
    </div>
  );
}

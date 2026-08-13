import { type ReactElement, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';

import { isEmpty } from '../../shared/helpers/is-empty';
import { useAdminStore } from '../stores/admin-store';

/** ログイン後の全画面共通のレイアウト */
export default function AdminLayout(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAdminStore(state => state.token);
  
  // JWT がなければトップページに遷移する
  useEffect(() => {
    if(isEmpty(token)) navigate('/', { replace: true });
  }, [navigate, token]);
  
  const menuItems = [
    { to: '/home'       , label: 'ホーム'         },
    { to: '/holomems'   , label: 'ホロメン'       },
    { to: '/cards'      , label: 'カード'         },
    { to: '/board-nodes', label: 'ホロメンボード' },
    { to: '/holoworks'  , label: 'ホロワーク'     }
  ];
  
  // TODO : モバイル向けにハンバーガーメニューボタンを表示し、広い画面では常時サイドメニューを表示しっぱなしにする。
  // TODO : 画面幅に応じた条件分岐を追加し、`lg : ` 以上ではサイドバーを常時表示、未満では閉じた状態から開閉可能にする。
  // TODO : バックドロップ背景を追加し、サイドメニュー展開時に背景クリックで閉じる挙動を実装する。
  // TODO : `memo` の編集テキストエリアをサイドメニュー内に配置する予定。保存ボタンや入力状態も別途実装する。
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-white p-6">
          <nav className="space-y-2">
            {menuItems.map(item => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    'block rounded px-3 py-2 transition-colors',
                    isActive ? 'bg-sky-100 font-bold text-sky-700' : 'text-slate-700 hover:bg-slate-100'
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

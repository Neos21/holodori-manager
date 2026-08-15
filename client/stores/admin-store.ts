import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** ログインユーザの情報を管理する State */
type AdminState = {
  /** JWT */
  token: string | null;
  /** LocalStorage から JWT の復元処理が完了したか否か : このフラグ管理を `onRehydrateStorage` でやっておかないと、未ログイン時でも `/home` への直遷移が成功してしまう */
  isHydrated: boolean;
  
  setToken: (token: string) => void;
  logout: () => void;
  setIsHydrated: () => void;
};

/** ログインユーザの情報を管理する Store */
export const useAdminStore = create<AdminState>()(
  persist(
    set => ({
      token: null,
      isHydrated: false,
      
      setToken: (token): unknown => set({ token }),
      logout: (): unknown => set({ token: null }),
      setIsHydrated: (): unknown => set({ isHydrated: true })
    }),
    {
      name: 'admin-store',
      // 復元完了状態は画面表示ごとに判定するため、`partialize()` を使って LocalStorage には JWT だけを保存するようにする
      partialize: state => ({ token: state.token }),
      onRehydrateStorage: (): ((state: AdminState | undefined) => void) => (state: AdminState | undefined): void => state?.setIsHydrated()
    }
  )
);

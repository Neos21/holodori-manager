import { create } from 'zustand';

import { failedToFetchMessage } from '../constants/client-messages';
import { adminApi } from '../helpers/admin-api';
import { extractApiErrorMessage } from '../helpers/extract-api-error-message';

import type { Memo } from '../../shared/types/entities/memo';
import type { Result } from '../../shared/types/utilities/result';

/** メモ一覧を管理する State */
type MemosState = {
  /** メモ一覧のインメモリキャッシュ */
  memos: Array<Memo>;
  /** API からメモ一覧を取得済みか否か・0件だった場合も取得済みとして扱う */
  isLoaded: boolean;
  
  /** 未取得の場合のみメモ一覧を取得する */
  loadMemos: () => Promise<Result<Array<Memo>>>;
  /** 保存済みメモをキャッシュに追加または上書きする */
  setMemo: (memo: Memo) => void;
  /** 指定したメモをキャッシュから削除する */
  removeMemo: (id: number) => void;
  /** ログアウト時にメモ一覧のキャッシュを破棄する */
  clearMemos: () => void;
};

/** キャッシュ破棄前に開始したリクエストを識別する世代番号 */
let cacheGeneration = 0;

/** 同じキャッシュ世代で複数コンポーネントから取得が要求された場合に共有する実行中のリクエスト */
let loadingRequest: {
  /** リクエスト開始時のキャッシュ世代・破棄済みキャッシュに対するリクエストか否かの判定に使用する */
  generation: number;
  /** 同じキャッシュ世代の呼び出し間で共有するメモ一覧取得処理 */
  promise: Promise<Result<Array<Memo>>>;
} | null = null;

/** メモ一覧を取得し、API 例外を画面で扱える Result に変換する */
const fetchMemos = async (generation: number): Promise<Result<Array<Memo>>> => {
  if(loadingRequest?.generation === generation) return await loadingRequest.promise;
  
  const promise = (async (): Promise<Result<Array<Memo>>> => {
    try {
      const response = await adminApi.get('/api/memos').json<{ result: Array<Memo>; }>();
      return { result: response.result };
    }
    catch(error) {
      return { error: extractApiErrorMessage(error, failedToFetchMessage('メモ一覧')) };
    }
  })();
  loadingRequest = { generation, promise };
  try {
    return await promise;
  }
  finally {
    if(loadingRequest?.promise === promise) loadingRequest = null;
  }
};

/** サイドメニューとメモ管理ページで共有するメモ一覧のインメモリキャッシュ Store */
export const useMemosStore = create<MemosState>()((set, get) => ({
  memos: [],
  isLoaded: false,
  
  loadMemos: async (): Promise<Result<Array<Memo>>> => {
    const state = get();
    if(state.isLoaded === true) return { result: state.memos };
    
    const requestedGeneration = cacheGeneration;
    const result = await fetchMemos(requestedGeneration);
    if(result.error == null && requestedGeneration === cacheGeneration) set({ memos: result.result, isLoaded: true });
    return result;
  },
  setMemo: (memo): void => {
    set(state => ({
      memos: state.memos.some(cachedMemo => cachedMemo.id === memo.id)
        ? state.memos.map(cachedMemo => cachedMemo.id === memo.id ? memo : cachedMemo)
        : [...state.memos, memo].sort((memoA, memoB) => memoA.id - memoB.id)
    }));
  },
  removeMemo: (id): void => {
    set(state => ({ memos: state.memos.filter(memo => memo.id !== id) }));
  },
  clearMemos: (): void => {
    cacheGeneration += 1;
    set({ memos: [], isLoaded: false });
  }
}));

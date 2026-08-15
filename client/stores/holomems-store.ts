import { create } from 'zustand';

import { adminApi } from '../helpers/admin-api';
import { extractApiErrorMessage } from '../helpers/extract-api-error-message';

import type { Holomem } from '../../shared/types/holomem';
import type { Result } from '../../shared/types/result';

/** ホロメン一覧を管理する State */
type HolomemsState = {
  /** ホロメン一覧のインメモリキャッシュ */
  holomems: Array<Holomem>;
  /** API からホロメン一覧を取得済みか否か・0件だった場合も取得済みとして扱う */
  isLoaded: boolean;
  
  /** 未取得の場合のみホロメン一覧を取得する */
  loadHolomems: () => Promise<Result<Array<Holomem>>>;
  /** キャッシュの状態にかかわらずホロメン一覧を再取得する */
  reloadHolomems: () => Promise<Result<Array<Holomem>>>;
  /** ログアウト時にホロメン一覧のキャッシュを破棄する */
  clearHolomems: () => void;
};

/** キャッシュ破棄前に開始したリクエストを識別する世代番号 */
let cacheGeneration = 0;

/** 同じキャッシュ世代で複数画面から取得が要求された場合に共有する実行中のリクエスト */
let loadingRequest: {
  generation: number;
  promise: Promise<Result<Array<Holomem>>>;
} | null = null;

/** ホロメン一覧を取得し、API例外を画面で扱える Result に変換する */
const fetchHolomems = async (generation: number): Promise<Result<Array<Holomem>>> => {
  if(loadingRequest?.generation === generation) return await loadingRequest.promise;
  
  const promise = (async (): Promise<Result<Array<Holomem>>> => {
    try {
      const response = await adminApi.get('/api/holomems').json<{ result: Array<Holomem>; }>();
      return { result: response.result };
    }
    catch(error) {
      return { error: extractApiErrorMessage(error, 'ホロメン一覧の取得に失敗しました') };
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

/** 複数画面で共有するホロメン一覧のインメモリキャッシュ Store */
export const useHolomemsStore = create<HolomemsState>()((set, get) => {
  /** API から取得したホロメン一覧でキャッシュを更新する */
  const updateHolomems = async (): Promise<Result<Array<Holomem>>> => {
    const requestedGeneration = cacheGeneration;
    const result = await fetchHolomems(requestedGeneration);
    if(result.error == null && requestedGeneration === cacheGeneration) set({ holomems: result.result, isLoaded: true });
    return result;
  };
  
  return {
    holomems: [],
    isLoaded: false,
    
    loadHolomems: async (): Promise<Result<Array<Holomem>>> => {
      const state = get();
      if(state.isLoaded === true) return { result: state.holomems };
      return await updateHolomems();
    },
    reloadHolomems: async (): Promise<Result<Array<Holomem>>> => await updateHolomems(),
    clearHolomems: (): void => {
      cacheGeneration += 1;
      set({ holomems: [], isLoaded: false });
    }
  };
});

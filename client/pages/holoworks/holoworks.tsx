import { type ReactElement, useEffect, useState } from 'react';

import { CreateHoloworkModal } from './components/create-holowork-modal';
import { HoloworkMemberStatusesTable } from './components/holowork-member-statuses-table';
import { HoloworksTable } from './components/holoworks-table';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { failedToFetchMessage } from '../../constants/client-messages';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { HoloworkDisplay } from '../../../shared/types/app/holowork-display';
import type { HoloworkMemberStatus } from '../../../shared/types/app/holowork-member-status';

/** ホロワーク管理ページ */
export default function HoloworksPage(): ReactElement {
  const [isLoading        , setIsLoading        ] = useState<boolean>(true);                    // 初回の枠一覧・メンバー状況取得中か否か
  const [holoworks        , setHoloworks        ] = useState<Array<HoloworkDisplay>>([]);       // 活動中メンバーを含む枠一覧
  const [memberStatuses   , setMemberStatuses   ] = useState<Array<HoloworkMemberStatus>>([]);  // 達成状況・活動状況・黄マス集計一覧
  const [listError        , setListError        ] = useState<string>('');                       // 一覧取得時のエラーメッセージ
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);                   // 枠追加モーダルを表示中か否か
  const [isSubmitting     , setIsSubmitting     ] = useState<boolean>(false);                   // 枠操作中か否か・枠操作、枠追加、メンバー編集の開始を無効化する
  
  /** 活動中メンバーを含むホロワーク枠一覧を取得する */
  const onLoadHoloworks = async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holoworks').json<{ result: Array<HoloworkDisplay>; }>();
      setHoloworks(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, failedToFetchMessage('ホロワーク枠一覧')));
    }
  };
  
  /** ホロメン別の達成状況・活動状況・黄マス集計を取得する */
  const onLoadMemberStatuses = async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holoworks/member-statuses').json<{ result: Array<HoloworkMemberStatus>; }>();
      setMemberStatuses(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, failedToFetchMessage('ホロメン別ステータス一覧')));
    }
  };
  
  /** 枠操作によって相互に変化する関連一覧を並行して再取得する */
  const onLoadData = async (): Promise<void> => {
    setListError('');
    await Promise.all([onLoadHoloworks(), onLoadMemberStatuses()]);
  };
  
  // 画面初期表示時に枠一覧とメンバー状況を並行して読み込む
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await Promise.all([onLoadHoloworks(), onLoadMemberStatuses()]);
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  return (
    <main>
      <h1>ホロワーク管理</h1>
      
      {!isEmpty(listError) && (
        <div className="alert alert-error alert-soft mb-4">{listError}</div>
      )}
      
      {isLoading ? (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      ) : (
        <>
          {/* ホロワーク枠一覧テーブル */}
          <HoloworksTable
            holoworks={holoworks}
            isDisabled={isSubmitting}
            onChangeSubmitting={setIsSubmitting}
            onUpdated={onLoadData}
          />
          
          {/* ホロメン別ホロワーク達成状況・黄マス情報テーブル */}
          <HoloworkMemberStatusesTable
            memberStatuses={memberStatuses}
            isDisabled={isSubmitting}
            onUpdated={onLoadMemberStatuses}
          />
          
          <div className="text-right">
            <button type="button" className="btn btn-info" onClick={() => setIsCreateModalOpen(true)} disabled={isSubmitting}>ホロワークの枠追加</button>
          </div>
        </>
      )}
      
      {/* 新規ホロワーク枠追加モーダル */}
      {isCreateModalOpen && (
        <CreateHoloworkModal onClose={() => setIsCreateModalOpen(false)} onCreated={onLoadData} />
      )}
    </main>
  );
}

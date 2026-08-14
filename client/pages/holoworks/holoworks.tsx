import { type ReactElement, useEffect, useState } from 'react';

import { CreateHoloworkModal } from './components/create-holowork-modal';
import { HoloworkMemberStatusesTable } from './components/holowork-member-statuses-table';
import { HoloworksTable } from './components/holoworks-table';
import { StartHoloworkModal } from './components/start-holowork-modal';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { HoloworkDisplay } from '../../../shared/types/holowork-display';
import type { HoloworkMemberStatus } from '../../../shared/types/holowork-member-status';

/** ホロワーク管理ページ */
export default function HoloworksPage(): ReactElement {
  const [isLoading     , setIsLoading     ] = useState<boolean>(true);
  const [holoworks     , setHoloworks     ] = useState<Array<HoloworkDisplay>>([]);
  const [memberStatuses, setMemberStatuses] = useState<Array<HoloworkMemberStatus>>([]);
  const [listError     , setListError     ] = useState<string>('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [startingHolowork , setStartingHolowork ] = useState<HoloworkDisplay | null>(null);
  const [isSubmitting     , setIsSubmitting     ] = useState<boolean>(false);
  
  const onLoadHoloworks = async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holoworks').json<{ result: Array<HoloworkDisplay>; }>();
      setHoloworks(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'ホロワーク枠一覧の取得に失敗しました'));
    }
  };
  
  const onLoadMemberStatuses = async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holoworks/member-statuses').json<{ result: Array<HoloworkMemberStatus>; }>();
      setMemberStatuses(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'ホロメン別ステータス一覧の取得に失敗しました'));
    }
  };
  
  const onLoadData = async (): Promise<void> => {
    setListError('');
    await Promise.all([onLoadHoloworks(), onLoadMemberStatuses()]);
  };
  
  // 画面初期表示時
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
  
  const onSubmitAction = async (holoworkId: number, action: 'complete' | 'abort'): Promise<void> => {
    setListError('');
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${holoworkId}/${action}`);
      await onLoadData();
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, action === 'complete' ? 'ホロワークの完了に失敗しました' : 'ホロワークの中断に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onDeleteHolowork = async (holoworkId: number): Promise<void> => {
    setListError('');
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/holoworks/${holoworkId}`);
      await onLoadData();
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'ホロワーク枠の削除に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
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
          <HoloworksTable
            holoworks={holoworks}
            isDisabled={isSubmitting}
            onStart={setStartingHolowork}
            onComplete={holoworkId => onSubmitAction(holoworkId, 'complete')}
            onAbort={holoworkId => onSubmitAction(holoworkId, 'abort')}
            onDelete={holoworkId => onDeleteHolowork(holoworkId)}
          />
          <HoloworkMemberStatusesTable memberStatuses={memberStatuses} />
          <div className="mb-8 text-right">
            <button type="button" className="btn btn-info" onClick={() => setIsCreateModalOpen(true)} disabled={isSubmitting}>ホロワークの枠追加</button>
          </div>
        </>
      )}
      
      {isCreateModalOpen && (
        <CreateHoloworkModal onClose={() => setIsCreateModalOpen(false)} onCreated={onLoadHoloworks} />
      )}
      
      {startingHolowork != null && (
        <StartHoloworkModal holowork={startingHolowork} onClose={() => setStartingHolowork(null)} onStarted={onLoadData} />
      )}
    </main>
  );
}

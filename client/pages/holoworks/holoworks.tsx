import { type ReactElement, useEffect, useState } from 'react';

import { CreateHoloworkModal } from './components/create-holowork-modal';
import { HoloworkAchievementModal } from './components/holowork-achievement-modal';
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
  const [actionError   , setActionError   ] = useState<string>('');  // 完了・中断時のエラー表示
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);  // 画面全体の Submit 系ボタンを非活性にするための State
  
  const [isCreateModalOpen  , setIsCreateModalOpen  ] = useState<boolean>(false);
  const [startingHolowork   , setStartingHolowork   ] = useState<HoloworkDisplay | null>(null);
  const [editingMemberStatus, setEditingMemberStatus] = useState<HoloworkMemberStatus | null>(null);
  
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
  
  const onSubmitAction = async (holowork: HoloworkDisplay, action: 'complete' | 'abort'): Promise<void> => {
    const confirmationMessage = action === 'complete'
      ? `「${holowork.name}」を完了しますか？\n活動中メンバー全員のホロワーク完了回数が 1 増えます。`
      : `「${holowork.name}」を中断しますか？\n中断ではホロワーク完了回数は増えません。`;
    if(!window.confirm(confirmationMessage)) return;
    
    setActionError('');
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${holowork.id}/${action}`);
      await onLoadData();
    }
    catch(error) {
      setActionError(extractApiErrorMessage(error, action === 'complete' ? 'ホロワークの完了に失敗しました' : 'ホロワークの中断に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onDeleteHolowork = async (holowork: HoloworkDisplay): Promise<void> => {
    if(!window.confirm('このホロワーク枠を削除しますか？')) return;
    
    setActionError('');
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/holoworks/${holowork.id}`);
      await onLoadData();
    }
    catch(error) {
      setActionError(extractApiErrorMessage(error, 'ホロワーク枠の削除に失敗しました'));
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
      
      {/* 完了・中止・削除時のエラー表示 */}
      {!isEmpty(actionError) && (
        <div className="alert alert-error alert-soft mb-4">{actionError}</div>
      )}
      
      {isLoading ? (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      ) : (
        <>
          {/* ホロワーク枠一覧テーブル*/}
          <HoloworksTable
            holoworks={holoworks}
            isDisabled={isSubmitting}
            onStart={setStartingHolowork}
            onComplete={holowork => onSubmitAction(holowork, 'complete')}
            onAbort={holowork => onSubmitAction(holowork, 'abort')}
            onDelete={onDeleteHolowork}
          />
          
          {/* ホロメン別ホロワーク達成状況・黄マス情報テーブル */}
          <HoloworkMemberStatusesTable memberStatuses={memberStatuses} onEdit={setEditingMemberStatus} />
          
          <div className="mb-8 text-right">
            <button type="button" className="btn btn-info" onClick={() => setIsCreateModalOpen(true)} disabled={isSubmitting}>ホロワークの枠追加</button>
          </div>
        </>
      )}
      
      {/* 新規ホロワーク枠追加モーダル */}
      {isCreateModalOpen && (
        <CreateHoloworkModal onClose={() => setIsCreateModalOpen(false)} onCreated={onLoadData} />
      )}
      
      {/* ホロワーク開始モーダル */}
      {startingHolowork != null && (
        <StartHoloworkModal holowork={startingHolowork} onClose={() => setStartingHolowork(null)} onStarted={onLoadData} />
      )}
      
      {/* ホロワーク達成状況編集モーダル */}
      {editingMemberStatus != null && (
        <HoloworkAchievementModal memberStatus={editingMemberStatus} onClose={() => setEditingMemberStatus(null)} onUpdated={onLoadMemberStatuses} />
      )}
    </main>
  );
}

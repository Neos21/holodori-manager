import { type ReactElement, useState } from 'react';

import { StartHoloworkModal } from './start-holowork-modal';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { failedToDeleteMessage, generalFailedMessage } from '../../../constants/client-messages';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { HoloworkDisplay } from '../../../../shared/types/app/holowork-display';

/** ホロワーク枠テーブルに渡す一覧と枠操作 */
type HoloworksTableProps = {
  /** 活動中メンバーを含む枠一覧 */
  holoworks         : Array<HoloworkDisplay>;
  /** API 操作中か否か・`true` の場合は全枠の操作ボタンを非活性にする */
  isDisabled        : boolean;
  /** API 操作中フラグを親コンポーネントで更新する */
  onChangeSubmitting: (isSubmitting: boolean) => void;
  /** 枠操作の成功後に関連一覧を再取得する */
  onUpdated         : () => Promise<void>;
};

/** ホロワーク枠一覧テーブル */
export const HoloworksTable = ({ holoworks, isDisabled, onChangeSubmitting, onUpdated }: HoloworksTableProps): ReactElement => {
  const [startingHolowork, setStartingHolowork] = useState<HoloworkDisplay | null>(null);  // `null` は開始対象未選択を表す
  const [actionError     , setActionError     ] = useState<string>('');                    // 完了・中断・削除時のエラーメッセージ
  
  /** `window.confirm()` で確認後に対象枠を完了または中断し、関連一覧を再取得する */
  const onSubmitAction = async (holowork: HoloworkDisplay, action: 'complete' | 'abort'): Promise<void> => {
    const confirmationMessage = action === 'complete'
      ? `「${holowork.name}」を完了しますか？\n活動中メンバー全員のホロワーク完了回数が 1 増えます。`
      : `「${holowork.name}」を中断しますか？\n中断ではホロワーク完了回数は増えません。`;
    if(!window.confirm(confirmationMessage)) return;
    
    setActionError('');
    onChangeSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${holowork.id}/${action}`);
      await onUpdated();
    }
    catch(error) {
      setActionError(extractApiErrorMessage(error, action === 'complete' ? generalFailedMessage('ホロワークの完了') : generalFailedMessage('ホロワークの中断')));
    }
    finally {
      onChangeSubmitting(false);
    }
  };
  
  /** `window.confirm()` で確認後、活動中メンバーがいない対象枠を削除する */
  const onDeleteHolowork = async (holowork: HoloworkDisplay): Promise<void> => {
    if(!window.confirm('このホロワーク枠を削除しますか？')) return;
    
    setActionError('');
    onChangeSubmitting(true);
    try {
      await adminApi.delete(`/api/holoworks/${holowork.id}`);
      await onUpdated();
    }
    catch(error) {
      setActionError(extractApiErrorMessage(error, failedToDeleteMessage('ホロワーク枠')));
    }
    finally {
      onChangeSubmitting(false);
    }
  };
  
  return (
    <>
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-bold">ホロワーク枠一覧</h2>
        
        {/* 完了・中断・削除時のエラー表示 */}
        {!isEmpty(actionError) && (
          <div className="alert alert-error alert-soft mb-4">{actionError}</div>
        )}
        
        {holoworks.length === 0 ? (
          <p>登録されているホロワーク枠はありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                  <th className="w-px pl-0 pr-1            ">枠の名前</th>
                  <th className="     px-1                 ">活動中メンバー</th>
                  <th className="w-px px-1      text-center">開始</th>
                  <th className="w-px px-1      text-center">完了</th>
                  <th className="w-px px-1      text-center">中断</th>
                  <th className="w-px pl-1 pr-0 text-center">削除</th>
                </tr>
              </thead>
              <tbody>
                {holoworks.map(holowork => {
                  /** 対象枠に活動中メンバーが存在するか否か・各操作ボタンの活性制御に使用する */
                  const hasActiveMembers = holowork.active_members.length > 0;
                  // 何となく見栄え的に `vertical-align` は `middle` で良い
                  return (
                    <tr key={holowork.id}>
                      <td className="         pl-0 pr-1      whitespace-nowrap            ">{holowork.name}</td>
                      <td className="min-w-35 px-1                                        ">{hasActiveMembers ? holowork.active_members.map(activeMember => (<div key={activeMember.holomems_id}>{activeMember.holomems_group_name} {activeMember.holomems_name}</div>)) : '-'}</td>
                      <td className="         px-1      py-0 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-info"    onClick={() => setStartingHolowork(holowork)}        disabled={isDisabled || hasActiveMembers} >開始</button></td>
                      <td className="         px-1      py-0 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-success" onClick={() => onSubmitAction(holowork, 'complete')} disabled={isDisabled || !hasActiveMembers}>完了</button></td>
                      <td className="         px-1      py-0 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-warning" onClick={() => onSubmitAction(holowork, 'abort')}    disabled={isDisabled || !hasActiveMembers}>中断</button></td>
                      <td className="         pl-1 pr-0 py-0 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-error"   onClick={() => onDeleteHolowork(holowork)}           disabled={isDisabled || hasActiveMembers} >削除</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      
      {/* ホロワーク開始モーダル */}
      {startingHolowork != null && (
        <StartHoloworkModal holowork={startingHolowork} onClose={() => setStartingHolowork(null)} onStarted={onUpdated} />
      )}
    </>
  );
};

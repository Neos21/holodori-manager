import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { candidatePriorities } from '../../../../shared/constants/app-constants';
import { maximumHoloworkMemberCount, minimumHoloworkMemberCount } from '../../../../shared/constants/holodori-constants';
import { formatDecimal } from '../../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { failedToFetchMessage, generalFailedMessage } from '../../../constants/client-messages';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { HoloworkCandidate, HoloworkCandidates, CandidatePriority } from '../../../../shared/types/app/holowork-candidate';
import type { HoloworkDisplay } from '../../../../shared/types/app/holowork-display';

/** ホロワーク開始モーダルに渡す対象枠と完了通知 */
type StartHoloworkModalProps = {
  /** 開始対象のホロワーク枠 */
  holowork : HoloworkDisplay;
  /** モーダルを閉じる */
  onClose  : () => void;
  /** 開始成功後に親コンポーネントで一覧を再取得する */
  onStarted: () => Promise<void>;
};

/** 優先モードのセレクトボックス表示名 */
const candidatePriorityDisplayNames: Record<CandidatePriority, string> = {
  count    : '完了回数重視',
  cube     : 'キューブ獲得量重視',
  training : '特訓アイテム獲得量重視',
  lesson_pt: 'レッスン Pt 獲得量重視'
};

/** ホロワーク開始モーダル */
export const StartHoloworkModal = ({ holowork, onClose, onStarted }: StartHoloworkModalProps): ReactElement => {
  const [priority , setPriority ] = useState<CandidatePriority | ''>('');  // 優先モードの選択値・空文字は未選択を表す
  const [isLoading, setIsLoading] = useState<boolean>(false);              // 優先モード変更時の候補取得中か否か
  
  const [priorityCandidates, setPriorityCandidates] = useState<Array<HoloworkCandidate>>([]);  // API が優先条件に合致すると判定した候補
  const [otherCandidates   , setOtherCandidates   ] = useState<Array<HoloworkCandidate>>([]);  // API が返す、優先候補と重複しない選択可能候補
  
  const [selectedHolomemsIds, setSelectedHolomemsIds] = useState<Array<number>>([]);  // 両候補テーブルで共有する選択済みのメンバー ID
  const [isSubmitting       , setIsSubmitting       ] = useState<boolean>(false);     // ホロワーク開始の送信中か否か
  const [formError          , setFormError          ] = useState<string>('');         // 候補取得・入力・開始 API のエラー
  
  /** 優先モードを切り替え、対応する候補区分を取得する */
  const onChangePriority = async (event: ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const selectedPriority = event.target.value as CandidatePriority | '';
    setPriority(selectedPriority);
    
    setSelectedHolomemsIds([]);  // 優先モードが変わると候補集合と比較条件も変わるため、旧モードでの選択は引き継がない
    setPriorityCandidates([]);
    setOtherCandidates([]);
    setFormError('');
    
    if(isEmpty(selectedPriority)) return;  // 未選択に戻した場合は API コールしない
    
    setIsLoading(true);
    try {
      const response = await adminApi.get('/api/holoworks/candidates', { searchParams: { priority: selectedPriority } }).json<{ result: HoloworkCandidates; }>();
      setPriorityCandidates(response.result.priority_candidates);
      setOtherCandidates(response.result.other_candidates);
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToFetchMessage('優先ホロメン候補')));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  /** 両候補テーブルで共有するホロメン選択を最大人数以内で更新する */
  const onChangeSelectedHolomem = (event: ChangeEvent<HTMLInputElement>): void => {
    const holomemId = Number(event.target.value);
    if(event.target.checked) {
      if(selectedHolomemsIds.length >= maximumHoloworkMemberCount) return;  // 最大人数を超える場合はメンバー選択しない
      return setSelectedHolomemsIds(prevHolomemsIds => [...prevHolomemsIds, holomemId]);
    }
    setSelectedHolomemsIds(prevHolomemsIds => prevHolomemsIds.filter(id => id !== holomemId));  // 選択したメンバーを解除する
  };
  
  /** 選択人数を検証し、最大人数未満の場合は `window.confirm()` で確認してホロワークを開始する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    if(selectedHolomemsIds.length < minimumHoloworkMemberCount) return setFormError(`開始するホロメンを ${minimumHoloworkMemberCount} 人以上選択してください`);
    if(selectedHolomemsIds.length < maximumHoloworkMemberCount && !window.confirm(`${maximumHoloworkMemberCount} 人選択されていません。このままホロワークを開始しますか？`)) return;
    
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${holowork.id}/start`, { json: { holomems_ids: selectedHolomemsIds } });
      setIsSubmitting(false);
      // 開始後は候補情報が古くなるため、先にモーダルを破棄してから再取得する
      onClose();
      await onStarted();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, generalFailedMessage('ホロワークの開始')));
      setIsSubmitting(false);
    }
  };
  
  /** 候補の種類に応じて完了回数または合計最終レートを持つテーブル行を描画する */
  const renderCandidate = (candidate: HoloworkCandidate): ReactElement => {
    const isSelected = selectedHolomemsIds.includes(candidate.holomems_id);
    return (
      <tr key={candidate.holomems_id} className="[&>td]:align-top">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
        <td className="p-0  text-center !align-middle"><input className="checkbox checkbox-sm" type="checkbox" value={candidate.holomems_id} checked={isSelected} onChange={onChangeSelectedHolomem} disabled={isSubmitting || (!isSelected && selectedHolomemsIds.length >= maximumHoloworkMemberCount)} /></td>
        <td className="px-1 whitespace-nowrap">{candidate.holomems_group_name}</td>
        <td className="px-1 whitespace-nowrap">{candidate.holomems_name}</td>
        {/* 判別用プロパティにより Candidate の Union 型を絞り込み、優先モードに対応する比較値を表示する */}
        {'current_count' in candidate ? (
          <>
            <td className="px-1 whitespace-nowrap text-right">{candidate.current_count}</td>
            <td className="px-1 whitespace-nowrap text-right">{candidate.next_threshold ?? '-'}</td>
            <td className="px-1 whitespace-nowrap text-right">{candidate.remaining_count ?? '-'}</td>
          </>
        ) : (
          <td className="px-1 whitespace-nowrap text-right">{candidate.total_rate > 0 ? formatDecimal(candidate.total_rate) + '%' : '-'}</td>
        )}
        <td className="min-w-35 pl-1 pr-0 whitespace-pre-wrap">{isEmpty(candidate.achievement_note) ? '-' : candidate.achievement_note}</td>
      </tr>
    );
  };
  
  /** API が排他的に返した候補区分を、同じ列構成のテーブルとして描画する */
  const renderCandidatesTable = (title: string, candidates: Array<HoloworkCandidate>): ReactElement => (
    <section className="mb-4">
      <h3 className="font-bold">{title}</h3>
      
      {candidates.length === 0 ? (
        <p className="text-sm">対象のホロメンはいません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead>
              <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                <th className="pl-0 pr-1 w-px text-center">選択</th>
                <th className="px-1      w-px            ">グループ</th>
                <th className="px-1      w-px            ">タレント名</th>
                {priority === 'count' ? (
                  <>
                    <th className="px-1 w-px text-right">完了</th>
                    <th className="px-1 w-px text-right">目標</th>
                    <th className="px-1 w-px text-right">残数</th>
                  </>
                ) : (
                  <th className="px-1 w-px text-right">合計レート</th>
                )}
                <th className="pl-1 pr-0">達成状況メモ</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(renderCandidate)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
  
  return (
    <div className="modal modal-open">
      {/* テーブルのためにスマホ向けでも最大限画面幅を使えるように広げる */}
      <div className="modal-box w-[97%] max-w-full px-4">
        <h2 className="mb-4 text-lg font-bold">ホロワーク開始 : {holowork.name}</h2>
        
        <form onSubmit={onSubmit}>
          <fieldset className="fieldset mb-3">
            <label className="fieldset-label">優先モード</label>
            <select className="select w-full" value={priority} onChange={onChangePriority} disabled={isLoading || isSubmitting}>
              <option value="">選択してください</option>
              {candidatePriorities.map(candidatePriority => (
                <option key={candidatePriority} value={candidatePriority}>{candidatePriorityDisplayNames[candidatePriority]}</option>
              ))}
            </select>
          </fieldset>
          
          {isLoading && (
            <div className="mb-4 text-center"><span className="loading loading-spinner text-warning" /></div>
          )}
          
          {!isLoading && !isEmpty(priority) && (
            <>
              <p className="mb-3 text-sm">選択人数 : {selectedHolomemsIds.length} / {maximumHoloworkMemberCount}</p>
              {renderCandidatesTable('優先候補'      , priorityCandidates)}
              {renderCandidatesTable('その他ホロメン', otherCandidates)}
            </>
          )}
          
          {!isEmpty(formError) && (
            <div className="alert alert-error alert-soft mb-4">{formError}</div>
          )}
          
          <div className="modal-action justify-between">
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>キャンセル</button>
            <button type="submit" className="btn btn-info" disabled={isLoading || isSubmitting}>開始する</button>
          </div>
        </form>
      </div>
      
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

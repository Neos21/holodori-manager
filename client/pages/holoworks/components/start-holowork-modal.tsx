import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { maximumHoloworkMemberCount, minimumHoloworkMemberCount } from '../../../../shared/constants/holodori-constants';
import { formatDecimal } from '../../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { generalFailedMessage } from '../../../constants/client-messages';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { HoloworkDisplay } from '../../../../shared/types/app/holowork-display';
import type { HoloworkMemberStatus } from '../../../../shared/types/app/holowork-member-status';

/** ホロワーク開始モーダルに渡す対象枠と完了通知 */
type StartHoloworkModalProps = {
  /** 開始対象のホロワーク枠 */
  holowork      : HoloworkDisplay;
  /** 達成状況・活動状況・黄マス集計一覧 */
  memberStatuses: Array<HoloworkMemberStatus>;
  /** モーダルを閉じる */
  onClose       : () => void;
  /** 開始成功後に親コンポーネントで一覧を再取得する */
  onStarted     : () => Promise<void>;
};

/** ホロワーク開始モーダル */
export const StartHoloworkModal = ({ holowork, memberStatuses, onClose, onStarted }: StartHoloworkModalProps): ReactElement => {
  const [expandedNoteHolomemIds, setExpandedNoteHolomemIds] = useState<Array<number>>([]);  // メモ欄を展開しているホロメン ID
  const [selectedHolomemsIds   , setSelectedHolomemsIds   ] = useState<Array<number>>([]);  // 全セクションで共有する重複なしの選択済みホロメン ID
  const [isSubmitting          , setIsSubmitting          ] = useState<boolean>(false);     // ホロワーク開始の送信中か否か
  const [formError             , setFormError             ] = useState<string>('');         // 入力・開始 API のエラー
  
  /** ホロメン表示順と ID を比較する */
  const compareHolomemOrder = (candidateA: HoloworkMemberStatus, candidateB: HoloworkMemberStatus): number => candidateA.holomems_sort_order - candidateB.holomems_sort_order || candidateA.holomems_id - candidateB.holomems_id;
  
  /** ページ表示時に取得済みの一覧から、他枠で活動していないホロメンだけを開始候補として扱う */
  const selectableMemberStatuses = memberStatuses.filter(memberStatus => memberStatus.active_holoworks_id == null);
  /** キューブ獲得量重視メンバ */
  const cubeCandidates = selectableMemberStatuses
    .filter(memberStatus => memberStatus.cube_total_rate > 0)
    .sort((candidateA, candidateB) => candidateB.cube_total_rate - candidateA.cube_total_rate || compareHolomemOrder(candidateA, candidateB));
  /** 特訓アイテム獲得量重視メンバ */
  const trainingCandidates = selectableMemberStatuses
    .filter(memberStatus => memberStatus.training_total_rate > 0)
    .sort((candidateA, candidateB) => candidateB.training_total_rate - candidateA.training_total_rate || compareHolomemOrder(candidateA, candidateB));
  /** レッスン Pt 獲得量重視メンバ */
  const lessonPtCandidates = selectableMemberStatuses
    .filter(memberStatus => memberStatus.lesson_pt_total_rate > 0)
    .sort((candidateA, candidateB) => candidateB.lesson_pt_total_rate - candidateA.lesson_pt_total_rate || compareHolomemOrder(candidateA, candidateB));
  /** アイテム3つとも獲得量アップしないメンバを抽出する */
  const noRateCandidates = selectableMemberStatuses.filter(memberStatus => memberStatus.cube_total_rate <= 0 && memberStatus.training_total_rate <= 0 && memberStatus.lesson_pt_total_rate <= 0);
  /** 完了回数重視メンバ */
  const countCandidates = noRateCandidates
    .filter(memberStatus => memberStatus.next_threshold != null)
    .sort((candidateA, candidateB) =>
      (candidateA.remaining_count ?? 0) - (candidateB.remaining_count ?? 0) ||
      candidateB.current_count - candidateA.current_count ||
      (candidateA.next_threshold ?? 0) - (candidateB.next_threshold ?? 0) ||
      compareHolomemOrder(candidateA, candidateB)
    );
  /** アイテム獲得量アップがなく完了回数のアチーブメントも全達成している、選択可能なメンバ */
  const otherCandidates = noRateCandidates
    .filter(memberStatus => memberStatus.next_threshold == null)
    .sort(compareHolomemOrder);
  
  /** メモ欄を1行省略表示と全文折り返し表示で切り替える */
  const onToggleNote = (holomemId: number): void => {
    setExpandedNoteHolomemIds(prevExpandedNoteHolomemIds => prevExpandedNoteHolomemIds.includes(holomemId)
      ? prevExpandedNoteHolomemIds.filter(id => id !== holomemId)
      : [...prevExpandedNoteHolomemIds, holomemId]);
  };
  
  /** 全セクションで共有するホロメン選択を、重複させず最大人数以内で更新する */
  const onChangeSelectedHolomem = (event: ChangeEvent<HTMLInputElement>): void => {
    const holomemId = Number(event.target.value);
    const isChecked = event.target.checked;
    setSelectedHolomemsIds(prevHolomemsIds => {
      if(!isChecked) return prevHolomemsIds.filter(id => id !== holomemId);  // 全セクションに重複表示された同じメンバーを解除する
      if(prevHolomemsIds.includes(holomemId) || prevHolomemsIds.length >= maximumHoloworkMemberCount) return prevHolomemsIds;
      return [...prevHolomemsIds, holomemId];
    });
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
  
  /** 候補テーブルの共通行を描画する */
  const renderCandidateTableBody = (holoworkMemberStatus: HoloworkMemberStatus, isShowRates: boolean, isShowAchievements: boolean = true): ReactElement => {
    const isSelected = selectedHolomemsIds.includes(holoworkMemberStatus.holomems_id);
    return (
      <tr key={holoworkMemberStatus.holomems_id} className="[&>td]:align-top">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
        <td className="p-0  text-center align-middle!"><input className="checkbox checkbox-sm" type="checkbox" value={holoworkMemberStatus.holomems_id} checked={isSelected} onChange={onChangeSelectedHolomem} disabled={isSubmitting || (!isSelected && selectedHolomemsIds.length >= maximumHoloworkMemberCount)} /></td>
        <td className="px-1             whitespace-nowrap">{holoworkMemberStatus.holomems_group_name}</td>
        <td className="px-1             whitespace-nowrap">{holoworkMemberStatus.holomems_name}</td>
        {/* 報酬アップアイテム */}
        {isShowRates && (
          <>
            <td className="px-1 text-right whitespace-nowrap">{holoworkMemberStatus.cube_total_rate      > 0 ? formatDecimal(holoworkMemberStatus.cube_total_rate     ) + '%' : '-'}</td>
            <td className="px-1 text-right whitespace-nowrap">{holoworkMemberStatus.training_total_rate  > 0 ? formatDecimal(holoworkMemberStatus.training_total_rate ) + '%' : '-'}</td>
            <td className="px-1 text-right whitespace-nowrap">{holoworkMemberStatus.lesson_pt_total_rate > 0 ? formatDecimal(holoworkMemberStatus.lesson_pt_total_rate) + '%' : '-'}</td>
          </>
        )}
        {/* 完了回数 */}
        <td className="px-1 text-right whitespace-nowrap">{holoworkMemberStatus.current_count}</td>
        {/* 完了回数に基づくアチーブメント達成状況 */}
        {isShowAchievements && (
          <>
            <td className="px-1 text-right whitespace-nowrap">{holoworkMemberStatus.next_threshold ?? '-'}</td>
            <td className="px-1 text-right whitespace-nowrap">{holoworkMemberStatus.remaining_count ?? '-'}</td>
          </>
        )}
        {/* ホロメンメモ */}
        <td className="pr-0 pl-1">
          {isEmpty(holoworkMemberStatus.holomems_note) ? '-' : (
            <div
              className={`cursor-pointer ${expandedNoteHolomemIds.includes(holoworkMemberStatus.holomems_id) ? 'whitespace-pre-wrap' : 'line-clamp-1'}`}
              onClick={() => onToggleNote(holoworkMemberStatus.holomems_id)}
            >
              {holoworkMemberStatus.holomems_note}
            </div>
          )}
        </td>
      </tr>
    );
  };
  
  /** セクションに応じた列構成で候補テーブルを描画する */
  const renderCandidatesTable = (title: string, holoworkMemberStatuses: Array<HoloworkMemberStatus>, isShowRates: boolean, isShowAchievements: boolean = true): ReactElement => (
    <section className="mb-4">
      <h3 className="font-bold">{title}</h3>
      
      {holoworkMemberStatuses.length === 0 ? (
        <p className="text-sm text-base-content/60">対象のホロメンはいません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead>
              <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                <th className="w-px pr-1 pl-0 text-center">選択</th>
                <th className="w-px px-1                 ">グループ</th>
                <th className="w-px px-1                 ">名前</th>
                {/* 報酬アップアイテム */}
                {isShowRates && (
                  <>
                    <th className="w-px px-1 text-right">キューブ</th>
                    <th className="w-px px-1 text-right">特訓アイテム</th>
                    <th className="w-px px-1 text-right">レッスン Pt</th>
                  </>
                )}
                {/* 完了回数 */}
                <th className="w-px px-1 text-right">完了</th>
                {/* 完了回数に基づくアチーブメント達成状況 */}
                {isShowAchievements && (
                  <>
                    <th className="w-px px-1 text-right">目標</th>
                    <th className="w-px px-1 text-right">残数</th>
                  </>
                )}
                {/* ホロメンメモ */}
                <th className="pr-0 pl-1">ホロメンメモ</th>
              </tr>
            </thead>
            <tbody>
              {holoworkMemberStatuses.map(holoworkMemberStatus => renderCandidateTableBody(holoworkMemberStatus, isShowRates, isShowAchievements))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
  
  return (
    <div className="modal modal-open">
      {/* テーブルのためにスマホ向けでも最大限画面幅を使えるように広げる */}
      <div className="modal-box w-[95%] max-w-full px-4">
        <h2 className="mb-4 text-lg font-bold">ホロワーク開始 : {holowork.name}</h2>
        
        <form onSubmit={onSubmit}>
          <p className="mb-3 text-sm">選択されたホロメン (最大 {maximumHoloworkMemberCount} 人) : {selectedHolomemsIds.length} 人</p>
          
          {renderCandidatesTable('キューブ獲得量重視'    , cubeCandidates    , true        )}
          {renderCandidatesTable('特訓アイテム獲得量重視', trainingCandidates, true        )}
          {renderCandidatesTable('レッスン Pt 獲得量重視', lessonPtCandidates, true        )}
          {renderCandidatesTable('完了回数重視'          , countCandidates   , false       )}
          {renderCandidatesTable('その他ホロメン'        , otherCandidates   , false, false)}
          
          {!isEmpty(formError) && (
            <div className="mb-4 alert alert-soft alert-error">{formError}</div>
          )}
          
          <div className="modal-action justify-between">
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>キャンセル</button>
            <button type="submit" className="btn btn-info"          disabled={isSubmitting}>開始する</button>
          </div>
        </form>
      </div>
      
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

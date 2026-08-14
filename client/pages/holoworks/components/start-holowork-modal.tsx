import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { candidatePriorities, candidatePriorityCount } from '../../../../shared/constants/app-constants';
import { formatDecimal } from '../../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { CandidatePriority } from '../../../../shared/types/app-types';
import type { HoloworkCandidate, HoloworkCandidates } from '../../../../shared/types/holowork-candidate';
import type { HoloworkDisplay } from '../../../../shared/types/holowork-display';

type StartHoloworkModalProps = {
  holowork : HoloworkDisplay;
  onClose  : () => void;
  onStarted: () => Promise<void>;
};

const candidatePriorityDisplayNames: Record<CandidatePriority, string> = {
  count    : '完了回数重視',
  cube     : 'キューブ獲得量重視',
  training : '特訓アイテム獲得量重視',
  lesson_pt: 'レッスン Pt 獲得量重視'
};

/** 候補の比較情報を表示する */
const getCandidateDetail = (candidate: HoloworkCandidate): string => {
  if('current_count' in candidate) return `完了 ${candidate.current_count} 回 / 次の閾値 ${candidate.next_threshold ?? '達成済'} / 残り ${candidate.remaining_count ?? '-'} 回`;
  return `合計最終レート ${formatDecimal(candidate.total_rate)}%`;
};

/** ホロワーク開始モーダル */
export const StartHoloworkModal = ({ holowork, onClose, onStarted }: StartHoloworkModalProps): ReactElement => {
  const [priority, setPriority] = useState<CandidatePriority>(candidatePriorityCount);
  const [priorityCandidates, setPriorityCandidates] = useState<Array<HoloworkCandidate>>([]);
  const [otherCandidates, setOtherCandidates] = useState<Array<HoloworkCandidate>>([]);
  const [selectedHolomemsIds, setSelectedHolomemsIds] = useState<Array<number>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  
  // モーダルを開いた時に初期優先モードの候補を取得する
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setFormError('');
      try {
        const response = await adminApi.get('/api/holoworks/candidates', { searchParams: { priority: candidatePriorityCount } }).json<{ result: HoloworkCandidates; }>();
        setPriorityCandidates(response.result.priority_candidates);
        setOtherCandidates(response.result.other_candidates);
      }
      catch(error) {
        setFormError(extractApiErrorMessage(error, '優先ホロメン候補の取得に失敗しました'));
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  const onChangePriority = async (event: ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const selectedPriority = event.target.value as CandidatePriority;
    setPriority(selectedPriority);
    // 優先モードが変わると候補集合と比較条件も変わるため、旧モードでの選択は引き継がない
    setSelectedHolomemsIds([]);
    setIsLoading(true);
    setFormError('');
    try {
      const response = await adminApi.get('/api/holoworks/candidates', { searchParams: { priority: selectedPriority } }).json<{ result: HoloworkCandidates; }>();
      setPriorityCandidates(response.result.priority_candidates);
      setOtherCandidates(response.result.other_candidates);
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, '優先ホロメン候補の取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  const onChangeSelectedHolomem = (event: ChangeEvent<HTMLInputElement>): void => {
    const holomemId = Number(event.target.value);
    if(event.target.checked) {
      if(selectedHolomemsIds.length >= 5) return;
      return setSelectedHolomemsIds(prevHolomemsIds => [...prevHolomemsIds, holomemId]);
    }
    setSelectedHolomemsIds(prevHolomemsIds => prevHolomemsIds.filter(id => id !== holomemId));
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    if(selectedHolomemsIds.length < 1) return setFormError('開始するホロメンを 1 人以上選択してください');
    
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${holowork.id}/start`, { json: { holomems_ids: selectedHolomemsIds } });
      setIsSubmitting(false);
      onClose();
      await onStarted();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, 'ホロワークの開始に失敗しました'));
      setIsSubmitting(false);
    }
  };
  
  const renderCandidate = (candidate: HoloworkCandidate): ReactElement => {
    const isSelected = selectedHolomemsIds.includes(candidate.holomems_id);
    return (
      <tr key={candidate.holomems_id}>
        <td><input className="checkbox" type="checkbox" value={candidate.holomems_id} checked={isSelected} onChange={onChangeSelectedHolomem} disabled={isSubmitting || (!isSelected && selectedHolomemsIds.length >= 5)} /></td>
        <td className="whitespace-nowrap">{candidate.holomems_group_name} : {candidate.holomems_name}</td>
        <td className="whitespace-nowrap">{getCandidateDetail(candidate)}</td>
        <td>{isEmpty(candidate.achievement_note) ? '-' : candidate.achievement_note}</td>
      </tr>
    );
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-5xl">
        <h2 className="mb-4 text-lg font-bold">ホロワーク開始</h2>
        
        <form onSubmit={onSubmit}>
          <fieldset className="fieldset mb-4">
            <label className="fieldset-label">ホロワーク枠</label>
            <input className="input w-full" type="text" value={holowork.name} readOnly disabled />
            
            <label className="fieldset-label">優先度</label>
            <select className="select w-full" value={priority} onChange={onChangePriority} disabled={isLoading || isSubmitting}>
              {candidatePriorities.map(candidatePriority => (
                <option key={candidatePriority} value={candidatePriority}>{candidatePriorityDisplayNames[candidatePriority]}</option>
              ))}
            </select>
          </fieldset>
          
          {isLoading ? (
            <div className="mb-4 text-center"><span className="loading loading-spinner text-warning" /></div>
          ) : (
            <>
              <p className="mb-4">選択人数 : {selectedHolomemsIds.length} / 5</p>
              <div className="mb-4 overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>選択</th>
                      <th>ホロメン</th>
                      <th>候補情報</th>
                      <th>メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityCandidates.map(renderCandidate)}
                    {otherCandidates.map(renderCandidate)}
                  </tbody>
                </table>
              </div>
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

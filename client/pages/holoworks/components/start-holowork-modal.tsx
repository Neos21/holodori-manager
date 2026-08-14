import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { candidatePriorities } from '../../../../shared/constants/app-constants';
import { maximumHoloworkMemberCount, minimumHoloworkMemberCount } from '../../../../shared/constants/holodori-constants';
import { formatDecimal } from '../../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { CandidatePriority } from '../../../../shared/types/app-types';
import type { HoloworkDisplay } from '../../../../shared/types/holowork';
import type { HoloworkCandidate, HoloworkCandidates } from '../../../../shared/types/holowork-candidate';

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

const candidateRateDisplayNames: Record<CandidatePriority, string> = {
  count    : '',
  cube     : 'キューブ合計最終レート',
  training : '特訓アイテム合計最終レート',
  lesson_pt: 'レッスン Pt 合計最終レート'
};

/** ホロワーク開始モーダル */
export const StartHoloworkModal = ({ holowork, onClose, onStarted }: StartHoloworkModalProps): ReactElement => {
  const [priority, setPriority] = useState<CandidatePriority | ''>('');
  const [priorityCandidates, setPriorityCandidates] = useState<Array<HoloworkCandidate>>([]);
  const [otherCandidates, setOtherCandidates] = useState<Array<HoloworkCandidate>>([]);
  const [selectedHolomemsIds, setSelectedHolomemsIds] = useState<Array<number>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  
  const onChangePriority = async (event: ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const selectedPriority = event.target.value as CandidatePriority | '';
    setPriority(selectedPriority);
    // 優先モードが変わると候補集合と比較条件も変わるため、旧モードでの選択は引き継がない
    setSelectedHolomemsIds([]);
    setPriorityCandidates([]);
    setOtherCandidates([]);
    setFormError('');
    if(isEmpty(selectedPriority)) return;
    
    setIsLoading(true);
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
      if(selectedHolomemsIds.length >= maximumHoloworkMemberCount) return;
      return setSelectedHolomemsIds(prevHolomemsIds => [...prevHolomemsIds, holomemId]);
    }
    setSelectedHolomemsIds(prevHolomemsIds => prevHolomemsIds.filter(id => id !== holomemId));
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    if(selectedHolomemsIds.length < minimumHoloworkMemberCount) return setFormError(`開始するホロメンを ${minimumHoloworkMemberCount} 人以上選択してください`);
    if(selectedHolomemsIds.length < maximumHoloworkMemberCount && !window.confirm(`${maximumHoloworkMemberCount} 人選択されていません。このままホロワークを開始しますか？`)) return;
    
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${holowork.id}/start`, { json: { holomems_ids: selectedHolomemsIds } });
      setIsSubmitting(false);
      // 開始後は候補情報が古くなるため、再取得より先にモーダルを破棄する
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
        <td className="text-center"><input className="checkbox checkbox-sm" type="checkbox" value={candidate.holomems_id} checked={isSelected} onChange={onChangeSelectedHolomem} disabled={isSubmitting || (!isSelected && selectedHolomemsIds.length >= maximumHoloworkMemberCount)} /></td>
        <td className="whitespace-nowrap">{candidate.holomems_group_name}</td>
        <td className="whitespace-nowrap">{candidate.holomems_name}</td>
        {'current_count' in candidate ? (
          <>
            <td className="whitespace-nowrap text-right">{candidate.current_count}</td>
            <td className="whitespace-nowrap text-right">{candidate.next_threshold ?? '-'}</td>
            <td className="whitespace-nowrap text-right">{candidate.remaining_count ?? '-'}</td>
          </>
        ) : (
          <td className="whitespace-nowrap text-right">{formatDecimal(candidate.total_rate)}</td>
        )}
        <td className="min-w-48 whitespace-pre-wrap">{isEmpty(candidate.achievement_note) ? '-' : candidate.achievement_note}</td>
      </tr>
    );
  };
  
  const renderCandidatesTable = (title: string, candidates: Array<HoloworkCandidate>): ReactElement => (
    <section className="mb-4">
      <h3 className="mb-2 font-bold">{title}</h3>
      {candidates.length === 0 ? (
        <p>対象のホロメンはいません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead>
              <tr>
                <th className="w-px whitespace-nowrap">選択</th>
                <th className="w-px whitespace-nowrap">グループ</th>
                <th className="w-px whitespace-nowrap">タレント名</th>
                {priority === 'count' ? (
                  <>
                    <th className="w-px whitespace-nowrap text-right">現在回数</th>
                    <th className="w-px whitespace-nowrap text-right">次回回数</th>
                    <th className="w-px whitespace-nowrap text-right">残り回数</th>
                  </>
                ) : (
                  <th className="w-px whitespace-nowrap text-right">{isEmpty(priority) ? '' : candidateRateDisplayNames[priority as CandidatePriority]}</th>
                )}
                <th className="min-w-48">達成状況メモ</th>
              </tr>
            </thead>
            <tbody>{candidates.map(renderCandidate)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-6xl">
        <h2 className="mb-4 text-lg font-bold">ホロワーク開始</h2>
        
        <form onSubmit={onSubmit}>
          <fieldset className="fieldset mb-4">
            <label className="fieldset-label">ホロワーク枠</label>
            <input className="input w-full" type="text" value={holowork.name} readOnly disabled />
            
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
              <p className="mb-2">選択人数 : {selectedHolomemsIds.length} / {maximumHoloworkMemberCount}</p>
              <p className="mb-4 text-sm">{maximumHoloworkMemberCount} 人未満でも開始できますが、通常は {maximumHoloworkMemberCount} 人選択してください。</p>
              {renderCandidatesTable('優先候補', priorityCandidates)}
              {renderCandidatesTable('その他の選択可能なホロメン', otherCandidates)}
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

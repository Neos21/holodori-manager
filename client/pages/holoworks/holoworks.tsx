import { type ChangeEvent, type ReactElement, type SubmitEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { candidatePriorities, candidatePriorityCount } from '../../../shared/constants/app-constants';
import { formatDecimal } from '../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { holoworkNameDisplayName, holoworkSchema } from '../../../shared/schemas/holowork-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { CandidatePriority } from '../../../shared/types/app-types';
import type { HoloworkCandidate, HoloworkCandidates } from '../../../shared/types/holowork-candidate';
import type { HoloworkDisplay } from '../../../shared/types/holowork-display';
import type { HoloworkMemberStatus } from '../../../shared/types/holowork-member-status';

const candidatePriorityDisplayNames: Record<CandidatePriority, string> = {
  count     : '完了回数重視',
  cube      : 'キューブ獲得量重視',
  training  : '特訓アイテム獲得量重視',
  lesson_pt : 'レッスン Pt 獲得量重視'
};

/** ホロワーク管理ページ */
export default function HoloworksPage(): ReactElement {
  const [isLoading    , setIsLoading    ] = useState<boolean>(true);
  const [holoworks    , setHoloworks    ] = useState<Array<HoloworkDisplay>>([]);
  const [memberStatuses, setMemberStatuses] = useState<Array<HoloworkMemberStatus>>([]);
  const [listError    , setListError    ] = useState<string>('');
  
  // 枠追加モーダル用 State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [holoworkName     , setHoloworkName     ] = useState<string>('');
  const [isCreating       , setIsCreating       ] = useState<boolean>(false);
  const [createError      , setCreateError      ] = useState<string>('');
  
  // 開始フォーム用 State・開始候補モーダル実装時に置き換える
  const [startingHoloworkId, setStartingHoloworkId] = useState<number | null>(null);
  const [priority, setPriority] = useState<CandidatePriority>(candidatePriorityCount);
  const [priorityCandidates, setPriorityCandidates] = useState<Array<HoloworkCandidate>>([]);
  const [otherCandidates, setOtherCandidates] = useState<Array<HoloworkCandidate>>([]);
  const [selectedHolomemsIds, setSelectedHolomemsIds] = useState<Array<number>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const priorityCandidateByHolomemsId = useMemo((): Map<number, HoloworkCandidate> => new Map(priorityCandidates.map(candidate => [candidate.holomems_id, candidate])), [priorityCandidates]);
  const otherCandidateByHolomemsId = useMemo((): Map<number, HoloworkCandidate> => new Map(otherCandidates.map(candidate => [candidate.holomems_id, candidate])), [otherCandidates]);
  
  const onLoadHoloworks = useCallback(async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holoworks').json<{ result: Array<HoloworkDisplay>; }>();
      setHoloworks(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'ホロワーク枠一覧の取得に失敗しました'));
    }
  }, []);
  
  const onLoadMemberStatuses = useCallback(async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holoworks/member-statuses').json<{ result: Array<HoloworkMemberStatus>; }>();
      setMemberStatuses(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'ホロメン別ステータス一覧の取得に失敗しました'));
    }
  }, []);
  
  const onLoadData = useCallback(async (): Promise<void> => {
    setListError('');
    await Promise.all([onLoadHoloworks(), onLoadMemberStatuses()]);
  }, [onLoadHoloworks, onLoadMemberStatuses]);
  
  // 画面初期表示時
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await onLoadData();
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, [onLoadData]);
  
  const onOpenCreateModal = (): void => {
    setHoloworkName('');
    setCreateError('');
    setIsCreateModalOpen(true);
  };
  
  const onCloseCreateModal = (): void => {
    setIsCreateModalOpen(false);
    setHoloworkName('');
    setCreateError('');
  };
  
  const onChangeHoloworkName = (event: ChangeEvent<HTMLInputElement>): void => setHoloworkName(event.target.value);
  
  const onSubmitCreate = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setCreateError('');
    
    const parsed = holoworkSchema.safeParse({ name: holoworkName });
    if(!parsed.success) return setCreateError(mergeIssues(parsed.error));
    
    setIsCreating(true);
    try {
      await adminApi.post('/api/holoworks', { json: parsed.data }).json<{ result: { id: number; }; }>();
      onCloseCreateModal();
      await onLoadHoloworks();
    }
    catch(error) {
      setCreateError(extractApiErrorMessage(error, 'ホロワーク枠の追加に失敗しました'));
    }
    finally {
      setIsCreating(false);
    }
  };
  
  const onLoadCandidates = async (selectedPriority: CandidatePriority): Promise<void> => {
    setListError('');
    try {
      const response = await adminApi.get('/api/holoworks/candidates', { searchParams: { priority: selectedPriority } }).json<{ result: HoloworkCandidates; }>();
      setPriorityCandidates(response.result.priority_candidates);
      setOtherCandidates(response.result.other_candidates);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, '優先ホロメン候補の取得に失敗しました'));
    }
  };
  
  const onStartSelection = async (holoworkId: number): Promise<void> => {
    setStartingHoloworkId(holoworkId);
    setSelectedHolomemsIds([]);
    await onLoadCandidates(priority);
  };
  
  const onChangePriority = async (event: ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const selectedPriority = event.target.value as CandidatePriority;
    setPriority(selectedPriority);
    setSelectedHolomemsIds([]);  // TODO : これ要るかなぁ？
    if(startingHoloworkId != null) await onLoadCandidates(selectedPriority);
  };
  
  const onChangeSelectedHolomem = (event: ChangeEvent<HTMLInputElement>): void => {
    const holomemId = Number(event.target.value);
    if(event.target.checked) {
      if(selectedHolomemsIds.length >= 5) return;
      return setSelectedHolomemsIds(prevHolomemsIds => [...prevHolomemsIds, holomemId]);
    }
    setSelectedHolomemsIds(prevHolomemsIds => prevHolomemsIds.filter(id => id !== holomemId));
  };
  
  const onCancelStart = (): void => {
    setStartingHoloworkId(null);
    setPriorityCandidates([]);
    setOtherCandidates([]);
    setSelectedHolomemsIds([]);
  };
  
  const onSubmitStart = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setListError('');
    if(startingHoloworkId == null) return setListError('開始対象のホロワーク枠を選択してください');
    if(selectedHolomemsIds.length < 1) return setListError('開始するホロメンを 1 人以上選択してください');
    
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${startingHoloworkId}/start`, { json: { holomems_ids: selectedHolomemsIds } });
      onCancelStart();
      await onLoadData();
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'ホロワークの開始に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
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
  
  const getCandidateDetail = (candidate: HoloworkCandidate | undefined): string => {
    if(candidate == null) return '通常候補';
    if('current_count' in candidate) return `完了 ${candidate.current_count} 回 / 次の閾値 ${candidate.next_threshold ?? '達成済'} / 残り ${candidate.remaining_count ?? '-'} 回`;
    return `合計最終レート ${formatDecimal(candidate.total_rate)}%`;
  };
  
  const displayedMemberStatuses = [...memberStatuses].sort((memberStatusA, memberStatusB) => {
    const candidateIndexA = priorityCandidates.findIndex(candidate => candidate.holomems_id === memberStatusA.holomems_id);
    const candidateIndexB = priorityCandidates.findIndex(candidate => candidate.holomems_id === memberStatusB.holomems_id);
    if(candidateIndexA === -1 && candidateIndexB === -1) return memberStatusA.holomems_sort_order - memberStatusB.holomems_sort_order || memberStatusA.holomems_id - memberStatusB.holomems_id;
    if(candidateIndexA === -1) return 1;
    if(candidateIndexB === -1) return -1;
    return candidateIndexA - candidateIndexB;
  });
  
  const isActionInProgress = isCreating || isSubmitting;
  
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
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-bold">ホロワーク枠一覧</h2>
            {holoworks.length === 0 ? (
              <p>登録されているホロワーク枠はありません。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr className="text-center">
                      <th className="whitespace-nowrap text-left">枠の名前</th>
                      <th className="min-w-48 whitespace-nowrap text-left">活動中メンバー</th>
                      <th className="w-px whitespace-nowrap">開始</th>
                      <th className="w-px whitespace-nowrap">完了</th>
                      <th className="w-px whitespace-nowrap">中断</th>
                      <th className="w-px whitespace-nowrap">削除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holoworks.map(holowork => {
                      const hasActiveMembers = holowork.active_members.length > 0;
                      return (
                        <tr key={holowork.id}>
                          <td className="whitespace-nowrap">{holowork.name}</td>
                          <td>
                            {hasActiveMembers ? holowork.active_members.map(activeMember => (
                              <div key={activeMember.holomems_id} className="whitespace-nowrap">{activeMember.holomems_group_name} : {activeMember.holomems_name}</div>
                            )) : '-'}
                          </td>
                          <td className="px-1 text-center"><button type="button" className="btn btn-xs" onClick={() => void onStartSelection(holowork.id)} disabled={isActionInProgress || hasActiveMembers}>開始</button></td>
                          <td className="px-1 text-center"><button type="button" className="btn btn-xs" onClick={() => void onSubmitAction(holowork.id, 'complete')} disabled={isActionInProgress || !hasActiveMembers}>完了</button></td>
                          <td className="px-1 text-center"><button type="button" className="btn btn-xs" onClick={() => void onSubmitAction(holowork.id, 'abort')} disabled={isActionInProgress || !hasActiveMembers}>中断</button></td>
                          <td className="px-1 text-center"><button type="button" className="btn btn-error btn-xs" onClick={() => void onDeleteHolowork(holowork.id)} disabled={isActionInProgress || hasActiveMembers}>削除</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-bold">ホロメン別ホロワーク達成状況・黄マス情報</h2>
            {memberStatuses.length === 0 ? (
              <p>表示対象のホロメンはいません。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr className="text-center">
                      <th className="w-px whitespace-nowrap text-left">グループ</th>
                      <th className="w-px whitespace-nowrap text-left">タレント名</th>
                      <th className="w-px whitespace-nowrap text-right">現在のホロワーク完了回数</th>
                      <th className="w-px whitespace-nowrap text-right">直近のアチーブメント回数</th>
                      <th className="w-px whitespace-nowrap text-right">達成までの残り回数</th>
                      <th className="min-w-48 text-left">達成状況メモ</th>
                      <th className="w-px whitespace-nowrap">活動中</th>
                      <th className="w-px whitespace-nowrap text-right">キューブ獲得アップ量</th>
                      <th className="w-px whitespace-nowrap text-right">特訓アイテム獲得アップ量</th>
                      <th className="w-px whitespace-nowrap text-right">レッスン Pt 獲得アップ量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberStatuses.map(memberStatus => (
                      <tr key={memberStatus.holomems_id}>
                        <td className="whitespace-nowrap">{memberStatus.holomems_group_name}</td>
                        <td className="whitespace-nowrap">{memberStatus.holomems_name}</td>
                        <td className="whitespace-nowrap text-right">{memberStatus.current_count}</td>
                        <td className="whitespace-nowrap text-right">{memberStatus.next_threshold ?? '-'}</td>
                        <td className="whitespace-nowrap text-right">{memberStatus.remaining_count ?? '-'}</td>
                        <td className="min-w-48 whitespace-pre-wrap">{isEmpty(memberStatus.achievement_note) ? '-' : memberStatus.achievement_note}</td>
                        <td className="whitespace-nowrap text-center">{memberStatus.active_holoworks_id == null ? '-' : '◯'}</td>
                        <td className="whitespace-nowrap text-right">{formatDecimal(memberStatus.cube_total_rate)}</td>
                        <td className="whitespace-nowrap text-right">{formatDecimal(memberStatus.training_total_rate)}</td>
                        <td className="whitespace-nowrap text-right">{formatDecimal(memberStatus.lesson_pt_total_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          
          <div className="mb-8 text-right">
            <button type="button" className="btn btn-info" onClick={onOpenCreateModal} disabled={isActionInProgress}>ホロワークの枠追加</button>
          </div>
          
          {startingHoloworkId != null && (
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-bold">ホロワーク開始</h2>
              <form onSubmit={onSubmitStart}>
                <label className="fieldset-label">優先度</label>
                <select className="select mb-4" value={priority} onChange={event => onChangePriority(event)} disabled={isSubmitting}>
                  {candidatePriorities.map(candidatePriority => (
                    <option key={candidatePriority} value={candidatePriority}>{candidatePriorityDisplayNames[candidatePriority]}</option>
                  ))}
                </select>
                <p className="mb-4">候補は上位に表示されます。選択人数 : {selectedHolomemsIds.length} / 5</p>
                <div className="mb-4 overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr><th>選択</th><th>ホロメン</th><th>候補情報</th><th>メモ</th></tr>
                    </thead>
                    <tbody>
                      {displayedMemberStatuses.map(memberStatus => {
                        const isActive = memberStatus.active_holoworks_id != null;
                        const isSelected = selectedHolomemsIds.includes(memberStatus.holomems_id);
                        const candidate = priorityCandidateByHolomemsId.get(memberStatus.holomems_id) ?? otherCandidateByHolomemsId.get(memberStatus.holomems_id);
                        return (
                          <tr key={memberStatus.holomems_id}>
                            <td><input className="checkbox" type="checkbox" value={memberStatus.holomems_id} checked={isSelected} onChange={onChangeSelectedHolomem} disabled={isSubmitting || isActive || (!isSelected && selectedHolomemsIds.length >= 5)} /></td>
                            <td className="whitespace-nowrap">{memberStatus.holomems_group_name} : {memberStatus.holomems_name}{isActive ? ' (活動中)' : ''}</td>
                            <td className="whitespace-nowrap">{getCandidateDetail(candidate)}</td>
                            <td>{isEmpty(memberStatus.achievement_note) ? '-' : memberStatus.achievement_note}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="join">
                  <button type="submit" className="btn btn-info join-item" disabled={isSubmitting}>開始する</button>
                  <button type="button" className="btn join-item" onClick={onCancelStart} disabled={isSubmitting}>キャンセル</button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
      
      {isCreateModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h2 className="mb-4 text-lg font-bold">新規ホロワーク枠追加</h2>
            
            {!isEmpty(createError) && (
              <div className="alert alert-error alert-soft mb-4">{createError}</div>
            )}
            
            <form onSubmit={onSubmitCreate}>
              <fieldset className="fieldset">
                <label className="fieldset-label">{holoworkNameDisplayName}</label>
                <input className="input w-full" name="name" type="text" value={holoworkName} onChange={onChangeHoloworkName} required />
              </fieldset>
              <div className="modal-action">
                <button type="button" className="btn" onClick={onCloseCreateModal} disabled={isCreating}>キャンセル</button>
                <button type="submit" className="btn btn-info" disabled={isCreating}>追加する</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={onCloseCreateModal} />
        </div>
      )}
    </main>
  );
}

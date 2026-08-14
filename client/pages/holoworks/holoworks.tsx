import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useMemo, useState } from 'react';

import { candidatePriorities, candidatePriorityCount } from '../../../shared/constants/app-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { holoworkNameDisplayName, holoworkSchema } from '../../../shared/schemas/holowork-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { ActiveHoloworkMember } from '../../../shared/types/active-holowork-member';
import type { CandidatePriority } from '../../../shared/types/app-types';
import type { Holomem } from '../../../shared/types/holomem';
import type { Holowork } from '../../../shared/types/holowork';
import type { HoloworkCandidate, HoloworkCandidates } from '../../../shared/types/holowork-candidate';
import type { HoloworkMemberStatus } from '../../../shared/types/holowork-member-status';

type ActiveHoloworkAssignment = Pick<ActiveHoloworkMember, 'holoworks_id' | 'holomems_id'>;

const candidatePriorityDisplayNames: Record<CandidatePriority, string> = {
  count     : '完了回数重視',
  cube      : 'キューブ獲得量重視',
  training  : '特訓アイテム獲得量重視',
  lesson_pt : 'レッスン Pt 獲得量重視'
};

export default function HoloworksPage(): ReactElement {
  const [isLoading            , setIsLoading            ] = useState<boolean>(true);
  const [holoworks            , setHoloworks            ] = useState<Array<Holowork>>([]);
  const [holomems             , setHolomems             ] = useState<Array<Holomem>>([]);
  const [activeHoloworkMembers, setActiveHoloworkMembers] = useState<Array<ActiveHoloworkAssignment>>([]);
  
  const [holoworkName, setHoloworkName] = useState<string>('');
  const [startingHoloworkId, setStartingHoloworkId] = useState<number | null>(null);
  const [priority, setPriority] = useState<CandidatePriority>(candidatePriorityCount);
  const [priorityCandidates, setPriorityCandidates] = useState<Array<HoloworkCandidate>>([]);
  const [otherCandidates, setOtherCandidates] = useState<Array<HoloworkCandidate>>([]);
  const [selectedHolomemsIds, setSelectedHolomemsIds] = useState<Array<number>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const holomemsById = useMemo((): Map<number, Holomem> => new Map(holomems.map(holomem => [holomem.id, holomem])), [holomems]);
  const activeHolomemsIds = useMemo((): Set<number> => new Set(activeHoloworkMembers.map(member => member.holomems_id)), [activeHoloworkMembers]);
  const priorityCandidateByHolomemsId = useMemo((): Map<number, HoloworkCandidate> => new Map(priorityCandidates.map(candidate => [candidate.holomems_id, candidate])), [priorityCandidates]);
  const otherCandidateByHolomemsId = useMemo((): Map<number, HoloworkCandidate> => new Map(otherCandidates.map(candidate => [candidate.holomems_id, candidate])), [otherCandidates]);
  
  const onLoadData = async (): Promise<void> => {
    try {
      const [holoworksResponse, holomemsResponse, activeHoloworkMembersResponse] = await Promise.all([
        adminApi.get('/api/holoworks').json<{ result: Array<Holowork>; }>(),
        adminApi.get('/api/holomems').json<{ result: Array<Holomem>; }>(),
        adminApi.get('/api/holoworks/member-statuses').json<{ result: Array<HoloworkMemberStatus>; }>()
      ]);
      setHoloworks(holoworksResponse.result);
      setHolomems(holomemsResponse.result);
      setActiveHoloworkMembers(activeHoloworkMembersResponse.result
        .filter(memberStatus => memberStatus.active_holoworks_id != null)
        .map(memberStatus => ({ holoworks_id: memberStatus.active_holoworks_id!, holomems_id: memberStatus.holomems_id })));
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ホロワーク情報の取得に失敗しました'));
    }
  };
  
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
  }, []);
  
  const onLoadCandidates = async (selectedPriority: CandidatePriority): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holoworks/candidates', { searchParams: { priority: selectedPriority } }).json<{ result: HoloworkCandidates; }>();
      setPriorityCandidates(response.result.priority_candidates);
      setOtherCandidates(response.result.other_candidates);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, '優先ホロメン候補の取得に失敗しました'));
    }
  };
  
  const onStartSelection = async (holoworkId: number): Promise<void> => {
    setErrorMessage('');
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
      if(selectedHolomemsIds.length >= 5) return;  // 既に5人選んでいる場合は追加不可
      return setSelectedHolomemsIds(prevHolomemsIds => [...prevHolomemsIds, holomemId]);  // 選択したホロメン ID を追加する
    }
    else {
      setSelectedHolomemsIds(prevHolomemsIds => prevHolomemsIds.filter(id => id !== holomemId));  // 選択したホロメン ID を除去する
    }
  };
  
  const onCancelStart = (): void => {
    setStartingHoloworkId(null);
    setPriorityCandidates([]);
    setOtherCandidates([]);
    setSelectedHolomemsIds([]);
  };
  
  const onSubmitStart = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    if(startingHoloworkId == null) return setErrorMessage('開始対象のホロワーク枠を選択してください');
    if(selectedHolomemsIds.length < 1) return setErrorMessage('開始するホロメンを 1 人以上選択してください');
    
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${startingHoloworkId}/start`, { json: { holomems_ids: selectedHolomemsIds } });
      await onLoadData();
      onCancelStart();
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ホロワークの開始に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onSubmitAction = async (holoworkId: number, action: 'complete' | 'abort'): Promise<void> => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${holoworkId}/${action}`);
      await onLoadData();
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, action === 'complete' ? 'ホロワークの完了に失敗しました' : 'ホロワークの中断に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onChangeHoloworkName = (event: ChangeEvent<HTMLInputElement>): void => setHoloworkName(event.target.value);
  
  const onCreateHolowork = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const parsed = holoworkSchema.safeParse({ name: holoworkName });
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.post('/api/holoworks', { json: parsed.data }).json<{ result: { id: number; }; }>();
      await onLoadData();
      setHoloworkName('');
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ホロワーク枠の追加に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onDeleteHolowork = async (holoworkId: number): Promise<void> => {
    setErrorMessage('');
    setIsSubmitting(true);
    
    try {
      await adminApi.delete(`/api/holoworks/${holoworkId}`);
      await onLoadData();
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ホロワーク枠の削除に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const getCandidateDetail = (candidate: HoloworkCandidate | undefined): string => {
    if(candidate == null) return '通常候補';
    if('current_count' in candidate) return `完了 ${candidate.current_count} 回 / 次の閾値 ${candidate.next_threshold ?? '達成済'} / 残り ${candidate.remaining_count ?? '—'} 回`;
    return `合計最終レート ${candidate.total_rate}%`;
  };
  
  const displayedHolomems = [...holomems].sort((firstHolomem, secondHolomem) => {
    const firstCandidateIndex = priorityCandidates.findIndex(candidate => candidate.holomems_id === firstHolomem.id);
    const secondCandidateIndex = priorityCandidates.findIndex(candidate => candidate.holomems_id === secondHolomem.id);
    if(firstCandidateIndex === -1 && secondCandidateIndex === -1) return firstHolomem.sort_order - secondHolomem.sort_order || firstHolomem.id - secondHolomem.id;
    if(firstCandidateIndex === -1) return 1;
    if(secondCandidateIndex === -1) return -1;
    return firstCandidateIndex - secondCandidateIndex;
  });
  
  return (
    <main>
      <h1>ホロワーク管理</h1>
      
      <section>
        <h2>ホロワーク枠の追加</h2>
        <form onSubmit={onCreateHolowork}>
          <label>
            {holoworkNameDisplayName}
            <input name="name" type="text" value={holoworkName} onChange={onChangeHoloworkName} required />
          </label>
          <button type="submit" disabled={isSubmitting}>追加する</button>
        </form>
      </section>
      
      {!isEmpty(errorMessage) && (
        <div className="alert-danger">{errorMessage}</div>
      )}
      
      {isLoading ? (
        <div className="label-warning">読込中…</div>
      ) : (
        <section>
          <h2>ホロワーク枠</h2>
          
          {holoworks.length === 0 ? (
            <div>ホロワーク枠がありません。</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{holoworkNameDisplayName}</th>
                  <th>活動中メンバー</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {holoworks.map(holowork => {
                  const activeMembers = activeHoloworkMembers.filter(member => member.holoworks_id === holowork.id);
                  return (
                    <tr key={holowork.id}>
                      <td>{holowork.name}</td>
                      <td>{activeMembers.length === 0 ? '—' : activeMembers.map(member => holomemsById.get(member.holomems_id)?.name ?? `ID : ${member.holomems_id}`).join('、')}</td>
                      <td>
                        {activeMembers.length === 0 ? (
                          <button type="button" onClick={() => void onStartSelection(holowork.id)} disabled={isSubmitting}>開始</button>
                        ) : (
                          <>
                            <button type="button" onClick={() => void onSubmitAction(holowork.id, 'complete')} disabled={isSubmitting}>完了</button>
                            <button type="button" onClick={() => void onSubmitAction(holowork.id, 'abort')} disabled={isSubmitting}>中断</button>
                          </>
                        )}
                        <button type="button" onClick={() => void onDeleteHolowork(holowork.id)} disabled={isSubmitting || activeMembers.length > 0}>削除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
      
      {startingHoloworkId != null && (
        <section>
          <h2>ホロワーク開始</h2>
          <form onSubmit={onSubmitStart}>
            <label>
              優先度
              <select value={priority} onChange={event => onChangePriority(event)} disabled={isSubmitting}>
                {candidatePriorities.map(candidatePriority => (
                  <option key={candidatePriority} value={candidatePriority}>{candidatePriorityDisplayNames[candidatePriority]}</option>
                ))}
              </select>
            </label>
            
            <p>候補は上位に表示されます。他枠で活動中のホロメンは選択できません。選択人数 : {selectedHolomemsIds.length} / 5</p>
            
            <table>
              <thead>
                <tr>
                  <th>選択</th>
                  <th>ホロメン</th>
                  <th>候補情報</th>
                  <th>メモ</th>
                </tr>
              </thead>
              <tbody>
                {displayedHolomems.map(holomem => {
                  const isActive = activeHolomemsIds.has(holomem.id);
                  const isSelected = selectedHolomemsIds.includes(holomem.id);
                  const candidate = priorityCandidateByHolomemsId.get(holomem.id) ?? otherCandidateByHolomemsId.get(holomem.id);
                  return (
                    <tr key={holomem.id}>
                      <td><input type="checkbox" value={holomem.id} checked={isSelected} onChange={onChangeSelectedHolomem} disabled={isSubmitting || isActive || (!isSelected && selectedHolomemsIds.length >= 5)} /></td>
                      <td>{holomem.group_name} : {holomem.name}{isActive ? ' (活動中)' : ''}</td>
                      <td>{getCandidateDetail(candidate)}</td>
                      <td>{holomem.note ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <button type="submit" disabled={isSubmitting}>開始する</button>
            <button type="button" onClick={onCancelStart} disabled={isSubmitting}>キャンセル</button>
          </form>
        </section>
      )}
    </main>
  );
}

import { type ChangeEvent, type ReactElement, useEffect, useState } from 'react';

import { CreateHoloworkModal } from './components/create-holowork-modal';
import { HoloworkAchievementModal } from './components/holowork-achievement-modal';
import { maximumHoloworkMemberCount } from '../../../shared/constants/holodori-constants';
import { formatDecimal } from '../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { startHoloworkSchema } from '../../../shared/schemas/start-holowork-schema';
import { HoloworkAchievementsService } from '../../../shared/services/holowork-achievements-service';
import { HolomemNoteModal } from '../../components/holomem-note-modal/holomem-note-modal';
import { failedToDeleteMessage, failedToFetchMessage, generalFailedMessage } from '../../constants/client-messages';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useHolomemsStore } from '../../stores/holomems-store';

import type { HoloworkDisplay } from '../../../shared/types/app/holowork-display';
import type { HoloworkMemberStatus } from '../../../shared/types/app/holowork-member-status';

/** ホロワーク管理ページ */
export default function HoloworksPage(): ReactElement {
  const [isLoading     , setIsLoading     ] = useState<boolean>(true);                    // 初回の枠一覧・メンバー状況取得中か否か
  const [holoworks     , setHoloworks     ] = useState<Array<HoloworkDisplay>>([]);       // 活動中メンバーを含む枠一覧
  const [memberStatuses, setMemberStatuses] = useState<Array<HoloworkMemberStatus>>([]);  // ホロメン別のホロワーク達成状況・活動状況・黄マス集計一覧
  const [listError     , setListError     ] = useState<string>('');                       // 一覧取得時のエラーメッセージ
  const [isSubmitting  , setIsSubmitting  ] = useState<boolean>(false);                   // 枠操作中か否か・枠操作、枠追加、メンバー編集の開始を無効化する
  
  // ホロメン一覧のソート順
  const [sortColumn, setSortColumn] = useState<'cube_total_rate' | 'training_total_rate' | 'lesson_pt_total_rate' | 'remaining_count' | null>(null);  // ソート中の列・`null` はホロメンの表示順
  
  // 枠開始時の操作
  const [startingHoloworkId , setStartingHoloworkId ] = useState<number | null>(null);  // 開始する枠の ID・`null` は未選択
  const [selectedHolomemsIds, setSelectedHolomemsIds] = useState<Array<number>>([]);    // 選択済ホロメン ID
  const [formError          , setFormError          ] = useState<string>('');           // 枠開始・操作時のエラー
  
  // 各種モーダル
  const [editingAchievement, setEditingAchievement] = useState<HoloworkMemberStatus | null>(null);  // 達成状況編集中のホロメン・`null` は未選択でモーダル非表示
  const [editingHolomemNote, setEditingHolomemNote] = useState<HoloworkMemberStatus | null>(null);  // メモ編集中のホロメン・`null` は未選択でモーダル非表示
  const [isCreateModalOpen , setIsCreateModalOpen ] = useState<boolean>(false);                     // 枠追加モーダルを表示中か否か
  
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
  
  // 画面初期表示時 : 枠一覧とメンバー状況を並行して読み込む
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
  
  /** 開始作業をしている最中のホロワーク枠 */
  const startingHolowork = holoworks.find(holowork => holowork.id === startingHoloworkId);
  
  /** ホロメン一覧をソートする : 達成済みの残数は末尾に置き、同値はホロメン表示順と ID 順で確定する */
  const sortedMemberStatuses = [...memberStatuses].sort((memberA, memberB) => {
    const difference = sortColumn == null ? 0 : sortColumn === 'remaining_count'
      ? (memberA.remaining_count ?? Infinity) - (memberB.remaining_count ?? Infinity)
      : memberB[sortColumn] - memberA[sortColumn];
    return difference || memberA.holomems_sort_order - memberB.holomems_sort_order || memberA.holomems_id - memberB.holomems_id;
  });
  
  /** ホロワーク開始時のホロメン選択時の処理 */
  const onChangeSelectedHolomem = (event: ChangeEvent<HTMLInputElement>): void => {
    const id = Number(event.target.value);
    const isChecked = event.target.checked;
    setSelectedHolomemsIds(previousSelectedHolomemsIds => {
      // チェックを外したら選択済ホロメンから除去する
      if(isChecked === false) return previousSelectedHolomemsIds.filter(previousSelectedHolomemsId => previousSelectedHolomemsId !== id);
      
      // 同じホロメンを重複追加しようとした場合 (異常)、上限より多く選択しようとした場合は何もしない
      if(previousSelectedHolomemsIds.includes(id) || previousSelectedHolomemsIds.length >= maximumHoloworkMemberCount) return previousSelectedHolomemsIds;
      
      // ホロメンを追加する
      return [...previousSelectedHolomemsIds, id];
    });
  };
  
  /** ホロワークの開始をキャンセルする (開始操作が完了した時の状態初期化にも利用) */
  const onResetStart = (): void => {
    setStartingHoloworkId(null);
    setSelectedHolomemsIds([]);
    setFormError('');
  };
  
  /** ホロワークを開始する */
  const onStart = async (): Promise<void> => {
    if(isSubmitting || startingHolowork == null) return;
    
    setFormError('');
    
    const parsed = startHoloworkSchema.safeParse({ holomems_ids: selectedHolomemsIds });
    if(parsed.success === false) return setFormError(mergeIssues(parsed.error));
    
    // 最大人数未満だった場合は確認する
    if(selectedHolomemsIds.length < maximumHoloworkMemberCount && !window.confirm(`${maximumHoloworkMemberCount} 人選択されていません。このままホロワークを開始しますか？`)) return;
    
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${startingHolowork.id}/start`, { json: parsed.data });
      
      /** 活動中となったメンバー情報を取得する */
      const activeMembers = memberStatuses.filter(memberStatus => selectedHolomemsIds.includes(memberStatus.holomems_id));
      // 枠に活動中メンバー情報を追加する
      setHoloworks(previousHoloworks => previousHoloworks.map(previousHolowork => previousHolowork.id === startingHolowork.id ? { ...previousHolowork, active_members: activeMembers } : previousHolowork));
      // ホロメン一覧を更新する
      setMemberStatuses(previousMemberStatuses => previousMemberStatuses.map(previousMemberStatus => selectedHolomemsIds.includes(previousMemberStatus.holomems_id)
        ? { ...previousMemberStatus, active_holoworks_id: startingHolowork.id, active_holoworks_name: startingHolowork.name }
        : previousMemberStatus));
      // 選択状況などの状態をリセットする
      onResetStart();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, generalFailedMessage('ホロワークの開始')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** ホロワーク枠を完了または中断する */
  const onCompleteOrAbort = async (holoworkDisplay: HoloworkDisplay, action: 'complete' | 'abort'): Promise<void> => {
    const confirmationMessage = action === 'complete'
      ? `「${holoworkDisplay.name}」を完了しますか？\n活動中メンバー全員のホロワーク完了回数が 1 増えます`
      : `「${holoworkDisplay.name}」を中断しますか？\n中断ではホロワーク完了回数は増えません`;
    if(!window.confirm(confirmationMessage)) return;
    
    setFormError('');
    setIsSubmitting(true);
    try {
      await adminApi.post(`/api/holoworks/${holoworkDisplay.id}/${action}`);
      setHoloworks(previousHoloworks => previousHoloworks.map(previousHolowork => previousHolowork.id === holoworkDisplay.id ? { ...previousHolowork, active_members: [] } : previousHolowork));
      setMemberStatuses(previousMemberStatuses => previousMemberStatuses.map(previousMemberStatus => {
        if(previousMemberStatus.active_holoworks_id !== holoworkDisplay.id) return previousMemberStatus;
        
        const currentCount = previousMemberStatus.current_count + (action === 'complete' ? 1 : 0);  // 「完了」ならインクリメントする
        return { ...previousMemberStatus, current_count: currentCount, ...HoloworkAchievementsService.calcProgress(currentCount), active_holoworks_id: null, active_holoworks_name: null };
      }));
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, generalFailedMessage(`ホロワークの${action === 'complete' ? '完了' : '中断'}`)));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** ホロワーク枠を削除する */
  const onDelete = async (holoworkDisplay: HoloworkDisplay): Promise<void> => {
    if(!window.confirm('このホロワーク枠を削除しますか？')) return;
    
    setFormError('');
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/holoworks/${holoworkDisplay.id}`);
      setHoloworks(previousHoloworks => previousHoloworks.filter(previousHolowork => previousHolowork.id !== holoworkDisplay.id));
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToDeleteMessage('ホロワーク枠')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** ホロワーク達成状況編集モーダルを開く */
  const onEditAchievement = (holoworkMemberStatus: HoloworkMemberStatus): void => {
    if(isSubmitting || startingHoloworkId != null) return;
    setEditingAchievement(holoworkMemberStatus);
  };
  
  /** ホロメンメモ編集モーダルを開く */
  const onEditHolomemNote = (holoworkMemberStatus: HoloworkMemberStatus): void => {
    if(isSubmitting || startingHoloworkId != null) return;
    setEditingHolomemNote(holoworkMemberStatus);
  };
  
  /** ホロメンメモ更新後に共有キャッシュとメンバー状況を再取得する */
  const onUpdateHolomemNote = async (): Promise<void> => {
    await useHolomemsStore.getState().reloadHolomems();
    await onLoadMemberStatuses();
  };
  
  /** ホロワーク枠追加後に関連一覧を並行して再取得する */
  const onCreatedHolowork = async (): Promise<void> => {
    setListError('');
    await Promise.all([onLoadHoloworks(), onLoadMemberStatuses()]);
  };
  
  return (
    <main>
      <h1>ホロワーク管理</h1>
      
      {isLoading && (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      )}
      
      {!isEmpty(listError) && (
        <div className="mb-4 alert alert-soft alert-error">{listError}</div>
      )}
      
      {!isLoading && (
        <>
          <section className="mb-8">
            <h2 className="mb-2 text-lg font-bold">ホロワーク枠一覧</h2>
            
            {holoworks.length === 0 ? (
              <p>登録されているホロワーク枠はありません。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                      <th className="w-px pr-1 pl-0            ">枠の名前</th>
                      <th className="     px-1                 ">活動中メンバー</th>
                      <th className="w-px px-1      text-center">開始</th>
                      <th className="w-px px-1      text-center">完了</th>
                      <th className="w-px px-1      text-center">中断</th>
                      <th className="w-px pr-0 pl-1 text-center">削除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holoworks.map(holowork => {
                      /** 対象枠に活動中メンバーが存在するか否か・各操作ボタンの活性制御に使用する */
                      const hasActiveMembers = holowork.active_members.length > 0;
                      // 見栄え的に `vertical-align` は `middle` で良い
                      return (
                        <tr key={holowork.id}>
                          <td className="         pr-1 pl-0                  whitespace-nowrap">{holowork.name}</td>
                          <td className="min-w-35 px-1                                        ">{hasActiveMembers ? holowork.active_members.map(activeMember => (<div key={activeMember.holomems_id}>{activeMember.holomems_group_name} {activeMember.holomems_name}</div>)) : '-'}</td>
                          <td className="         px-1      py-0 text-center whitespace-nowrap"><button type="button" className="btn btn-info    btn-xs" onClick={() => setStartingHoloworkId(holowork.id)}  disabled={isSubmitting || startingHoloworkId != null || hasActiveMembers} >開始</button></td>
                          <td className="         px-1      py-0 text-center whitespace-nowrap"><button type="button" className="btn btn-success btn-xs" onClick={() => onCompleteOrAbort(holowork, 'complete')} disabled={isSubmitting || startingHoloworkId != null || !hasActiveMembers}>完了</button></td>
                          <td className="         px-1      py-0 text-center whitespace-nowrap"><button type="button" className="btn btn-warning btn-xs" onClick={() => onCompleteOrAbort(holowork, 'abort')}    disabled={isSubmitting || startingHoloworkId != null || !hasActiveMembers}>中断</button></td>
                          <td className="         py-0 pr-0 pl-1 text-center whitespace-nowrap"><button type="button" className="btn btn-error   btn-xs" onClick={() => onDelete(holowork)}             disabled={isSubmitting || startingHoloworkId != null || hasActiveMembers} >削除</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          
          {/* 枠の開始・完了・中断・削除時のエラー表示 */}
          {!isEmpty(formError) && (
            <div className="mb-4 alert alert-soft alert-error">{formError}</div>
          )}
          
          {/* ホロワーク開始時に表示される選択状況 */}
          {startingHolowork != null && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span>{startingHolowork.name} : {selectedHolomemsIds.length} / {maximumHoloworkMemberCount} 人選択</span>
              <button type="button" className="btn btn-info btn-sm" disabled={isSubmitting} onClick={onStart}>開始する</button>
              <button type="button" className="btn btn-sm" disabled={isSubmitting} onClick={onResetStart}>キャンセル</button>
            </div>
          )}
          
          <section className="mb-8">
            <h2 className="mb-2 text-lg font-bold">ホロワーク達成状況・黄マス情報</h2>
            {memberStatuses.length === 0 ? (
              <p>表示対象のホロメンはいません。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                      <th className=" w-px                pr-1 pl-0 text-center">選択</th>
                      <th className=" w-px cursor-pointer px-1      text-base-content/80" onClick={() => setSortColumn(null)}>グループ</th>
                      <th className=" w-px cursor-pointer px-1      text-base-content/80" onClick={() => setSortColumn(null)}>名前</th>
                      <th className=" w-px                px-1      text-right ">完了</th>
                      <th className=" w-px                px-1      text-right ">目標</th>
                      <th className={`w-px cursor-pointer px-1      text-right ${sortColumn === 'remaining_count'      ? 'text-info' : 'text-base-content/80'}`} onClick={() => setSortColumn('remaining_count'     )}>残数</th>
                      <th className={`w-px cursor-pointer px-1      text-right ${sortColumn === 'cube_total_rate'      ? 'text-info' : 'text-base-content/80'}`} onClick={() => setSortColumn('cube_total_rate'     )}>キューブ</th>
                      <th className={`w-px cursor-pointer px-1      text-right ${sortColumn === 'training_total_rate'  ? 'text-info' : 'text-base-content/80'}`} onClick={() => setSortColumn('training_total_rate' )}>特訓</th>
                      <th className={`w-px cursor-pointer px-1      text-right ${sortColumn === 'lesson_pt_total_rate' ? 'text-info' : 'text-base-content/80'}`} onClick={() => setSortColumn('lesson_pt_total_rate')}>レッスン</th>
                      <th className="                     pr-0 pl-1            ">ホロメンメモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 活動中メンバーには背景色を付ける */}
                    {sortedMemberStatuses.map(memberStatus => (
                      <tr key={memberStatus.holomems_id} className={`[&>td]:align-top ${memberStatus.active_holoworks_id == null ? '' : 'bg-info/10'}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                        <td className="                        pr-1 pl-0 text-center                 "><input type="checkbox" className="checkbox checkbox-sm" value={memberStatus.holomems_id} checked={selectedHolomemsIds.includes(memberStatus.holomems_id)} onChange={onChangeSelectedHolomem} disabled={isSubmitting || startingHoloworkId == null || memberStatus.active_holoworks_id != null || (selectedHolomemsIds.length >= maximumHoloworkMemberCount && !selectedHolomemsIds.includes(memberStatus.holomems_id))} /></td>
                        <td className="                        px-1                 whitespace-nowrap">{memberStatus.holomems_group_name}</td>
                        <td className="                        px-1                 whitespace-nowrap">{memberStatus.holomems_name}</td>
                        <td className="         cursor-pointer px-1      text-right whitespace-nowrap" onClick={() => onEditAchievement(memberStatus)}>{memberStatus.current_count}</td>
                        <td className="                        px-1      text-right whitespace-nowrap">{memberStatus.next_threshold ?? '-'}</td>
                        <td className="                        px-1      text-right whitespace-nowrap">{memberStatus.remaining_count ?? '-'}</td>
                        <td className="                        px-1      text-right whitespace-nowrap">{memberStatus.cube_total_rate      > 0 ? formatDecimal(memberStatus.cube_total_rate     ) + '%' : '-'}</td>
                        <td className="                        px-1      text-right whitespace-nowrap">{memberStatus.training_total_rate  > 0 ? formatDecimal(memberStatus.training_total_rate ) + '%' : '-'}</td>
                        <td className="                        px-1      text-right whitespace-nowrap">{memberStatus.lesson_pt_total_rate > 0 ? formatDecimal(memberStatus.lesson_pt_total_rate) + '%' : '-'}</td>
                        <td className="min-w-35 cursor-pointer pr-0 pl-1                             " onClick={() => onEditHolomemNote(memberStatus)}>
                          {/* `td` 要素に `line-clamp-1` を付けると折り返された文字が見切れるため `div` 必須 */}
                          <div className="line-clamp-1">{isEmpty(memberStatus.holomems_note) ? '-' : memberStatus.holomems_note}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          
          {/* ホロワーク達成状況編集モーダル */}
          {editingAchievement != null && (
            <HoloworkAchievementModal
              holomem={{
                id        : editingAchievement.holomems_id,
                group_name: editingAchievement.holomems_group_name,
                name      : editingAchievement.holomems_name
              }}
              holoworkAchievement={{
                id           : editingAchievement.holowork_achievements_id,
                current_count: editingAchievement.current_count
              }}
              onClose={() => setEditingAchievement(null)}
              onUpdated={onLoadMemberStatuses}
            />
          )}
          
          {/* ホロメンメモ編集モーダル */}
          {editingHolomemNote != null && (
            <HolomemNoteModal
              holomem={{
                id        : editingHolomemNote.holomems_id,
                group_name: editingHolomemNote.holomems_group_name,
                name      : editingHolomemNote.holomems_name,
                note      : editingHolomemNote.holomems_note
              }}
              onClose={() => setEditingHolomemNote(null)}
              onUpdated={onUpdateHolomemNote}
            />
          )}
          
          <div className="text-right">
            <button type="button" className="btn btn-info" onClick={() => setIsCreateModalOpen(true)} disabled={isSubmitting || startingHoloworkId != null}>ホロワークの枠追加</button>
          </div>
          
          {/* 新規ホロワーク枠追加モーダル */}
          {isCreateModalOpen && (
            <CreateHoloworkModal onClose={() => setIsCreateModalOpen(false)} onCreated={onCreatedHolowork} />
          )}
        </>
      )}
    </main>
  );
}

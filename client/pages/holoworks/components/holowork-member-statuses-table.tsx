
import { type ReactElement, useState } from 'react';

import { HoloworkAchievementModal } from './holowork-achievement-modal';
import { formatDecimal } from '../../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { HolomemNoteModal } from '../../../components/holomem-note-modal/holomem-note-modal';
import { useHolomemsStore } from '../../../stores/holomems-store';

import type { HoloworkMemberStatus } from '../../../../shared/types/app/holowork-member-status';

/** ホロメン別ステータステーブルに渡す一覧と編集操作 */
type HoloworkMemberStatusesTableProps = {
  /** 表示するホロメン別ステータス一覧 */
  memberStatuses: Array<HoloworkMemberStatus>;
  /** 枠操作中か否か・`true` の場合は編集モーダルを開かない */
  isDisabled    : boolean;
  /** 更新成功後にメンバー状況を再取得する */
  onUpdated     : () => Promise<void>;
};

/** ホロメン別ホロワーク達成状況・黄マス情報テーブル */
export const HoloworkMemberStatusesTable = ({ memberStatuses, isDisabled, onUpdated }: HoloworkMemberStatusesTableProps): ReactElement => {
  const [editingHoloworkAchievementMemberStatus, setEditingHoloworkAchievementMemberStatus] = useState<HoloworkMemberStatus | null>(null);  // `null` は達成状況の編集対象未選択を表す
  const [editingHolomemNoteMemberStatus        , setEditingHolomemNoteMemberStatus        ] = useState<HoloworkMemberStatus | null>(null);  // `null` はホロメンメモの編集対象未選択を表す
  
  /** 枠操作中でなければホロワーク達成状況編集モーダルを開く */
  const onEditAchievement = (memberStatus: HoloworkMemberStatus): void => {
    if(isDisabled) return;
    setEditingHoloworkAchievementMemberStatus(memberStatus);
  };
  
  /** 枠操作中でなければホロメンメモ編集モーダルを開く */
  const onEditNote = (memberStatus: HoloworkMemberStatus): void => {
    if(isDisabled) return;
    setEditingHolomemNoteMemberStatus(memberStatus);
  };
  
  /** ホロメンメモ更新後に共有キャッシュを更新してから、親コンポーネントの一覧更新を呼び出す */
  const onUpdateHolomemNote = async (): Promise<void> => {
    await useHolomemsStore.getState().reloadHolomems();
    await onUpdated();
  };
  
  return (
    <>
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-bold">ホロワーク達成状況・黄マス情報</h2>
        {memberStatuses.length === 0 ? (
          <p>表示対象のホロメンはいません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                  <th className="w-px pl-0 pr-1           ">グループ</th>
                  <th className="w-px px-1                ">名前</th>
                  <th className="w-px px-1      text-right">完了</th>
                  <th className="w-px px-1      text-right">目標</th>
                  <th className="w-px px-1      text-right">残数</th>
                  <th className="w-px px-1      text-right">キューブ</th>
                  <th className="w-px px-1      text-right">特訓</th>
                  <th className="w-px px-1      text-right">レッスン</th>
                  <th className="     pl-1 pr-0           ">ホロメンメモ</th>
                </tr>
              </thead>
              <tbody>
                {/* 活動中メンバーには水色背景を付ける */}
                {memberStatuses.map(memberStatus => (
                  <tr key={memberStatus.holomems_id} className={`[&>td]:align-top ${memberStatus.active_holoworks_id == null ? '' : 'bg-info/10'}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                    <td className="         pl-0 pr-1 whitespace-nowrap                            ">{memberStatus.holomems_group_name}</td>
                    <td className="         px-1      whitespace-nowrap                            ">{memberStatus.holomems_name}</td>
                    <td className="         px-1      whitespace-nowrap   text-right cursor-pointer" onClick={() => onEditAchievement(memberStatus)}>{memberStatus.current_count}</td>
                    <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.next_threshold ?? '-'}</td>
                    <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.remaining_count ?? '-'}</td>
                    <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.cube_total_rate      > 0 ? formatDecimal(memberStatus.cube_total_rate     ) + '%' : '-'}</td>
                    <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.training_total_rate  > 0 ? formatDecimal(memberStatus.training_total_rate ) + '%' : '-'}</td>
                    <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.lesson_pt_total_rate > 0 ? formatDecimal(memberStatus.lesson_pt_total_rate) + '%' : '-'}</td>
                    <td className="min-w-35 pl-1 pr-0 line-clamp-1                  cursor-pointer" onClick={() => onEditNote(memberStatus)}>{isEmpty(memberStatus.holomems_note) ? '-' : memberStatus.holomems_note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      
      {/* ホロワーク達成状況編集モーダル */}
      {editingHoloworkAchievementMemberStatus != null && (
        <HoloworkAchievementModal
          holomem={{
            id        : editingHoloworkAchievementMemberStatus.holomems_id,
            group_name: editingHoloworkAchievementMemberStatus.holomems_group_name,
            name      : editingHoloworkAchievementMemberStatus.holomems_name
          }}
          holoworkAchievement={{
            id           : editingHoloworkAchievementMemberStatus.holowork_achievements_id,
            current_count: editingHoloworkAchievementMemberStatus.current_count
          }}
          onClose={() => setEditingHoloworkAchievementMemberStatus(null)}
          onUpdated={onUpdated}
        />
      )}
      
      {/* ホロメンメモ編集モーダル */}
      {editingHolomemNoteMemberStatus != null && (
        <HolomemNoteModal
          holomem={{
            id        : editingHolomemNoteMemberStatus.holomems_id,
            group_name: editingHolomemNoteMemberStatus.holomems_group_name,
            name      : editingHolomemNoteMemberStatus.holomems_name,
            note      : editingHolomemNoteMemberStatus.holomems_note
          }}
          onClose={() => setEditingHolomemNoteMemberStatus(null)}
          onUpdated={onUpdateHolomemNote}
        />
      )}
    </>
  );
};

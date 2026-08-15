
import { formatDecimal } from '../../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../../shared/helpers/is-empty';

import type { HoloworkMemberStatus } from '../../../../shared/types/app/holowork-member-status';
import type { ReactElement } from 'react';

/** ホロメン別ステータステーブルに渡す一覧と編集操作 */
type HoloworkMemberStatusesTableProps = {
  /** 表示するホロメン別ステータス一覧 */
  memberStatuses: Array<HoloworkMemberStatus>;
  /** ホロワーク達成状況編集モーダルを開くため、編集対象を親コンポーネントに通知する */
  onEdit        : (memberStatus: HoloworkMemberStatus) => void;
};

/** ホロメン別ホロワーク達成状況・黄マス情報テーブル */
export const HoloworkMemberStatusesTable = ({ memberStatuses, onEdit }: HoloworkMemberStatusesTableProps): ReactElement => (
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
              <th className="     pl-1 pr-0           ">達成状況メモ</th>
            </tr>
          </thead>
          <tbody>
            {/* 活動中メンバーには水色背景を付ける */}
            {memberStatuses.map(memberStatus => (
              <tr key={memberStatus.holomems_id} className={`[&>td]:align-top ${memberStatus.active_holoworks_id == null ? '' : 'bg-info/10'}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                <td className="         pl-0 pr-1 whitespace-nowrap                            ">{memberStatus.holomems_group_name}</td>
                <td className="         px-1      whitespace-nowrap                            ">{memberStatus.holomems_name}</td>
                <td className="         px-1      whitespace-nowrap   text-right cursor-pointer" onClick={() => onEdit(memberStatus)}>{memberStatus.current_count}</td>
                <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.next_threshold ?? '-'}</td>
                <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.remaining_count ?? '-'}</td>
                <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.cube_total_rate      > 0 ? formatDecimal(memberStatus.cube_total_rate     ) + '%' : '-'}</td>
                <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.training_total_rate  > 0 ? formatDecimal(memberStatus.training_total_rate ) + '%' : '-'}</td>
                <td className="         px-1      whitespace-nowrap   text-right               ">{memberStatus.lesson_pt_total_rate > 0 ? formatDecimal(memberStatus.lesson_pt_total_rate) + '%' : '-'}</td>
                <td className="min-w-35 pl-1 pr-0 whitespace-pre-wrap            cursor-pointer" onClick={() => onEdit(memberStatus)}>{isEmpty(memberStatus.achievement_note) ? '-' : memberStatus.achievement_note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

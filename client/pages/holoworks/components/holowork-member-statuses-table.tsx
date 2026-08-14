
import { formatDecimal } from '../../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../../shared/helpers/is-empty';

import type { HoloworkMemberStatus } from '../../../../shared/types/holowork-member-status';
import type { ReactElement } from 'react';

type HoloworkMemberStatusesTableProps = {
  memberStatuses: Array<HoloworkMemberStatus>;
  onEdit        : (memberStatus: HoloworkMemberStatus) => void;
};

/** ホロメン別ホロワーク達成状況・黄マス情報テーブル */
export const HoloworkMemberStatusesTable = ({ memberStatuses, onEdit }: HoloworkMemberStatusesTableProps): ReactElement => (
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
                <td className="cursor-pointer whitespace-nowrap text-right" onClick={() => onEdit(memberStatus)}>{memberStatus.current_count}</td>
                <td className="whitespace-nowrap text-right">{memberStatus.next_threshold ?? '-'}</td>
                <td className="whitespace-nowrap text-right">{memberStatus.remaining_count ?? '-'}</td>
                <td className="min-w-48 cursor-pointer whitespace-pre-wrap" onClick={() => onEdit(memberStatus)}>{isEmpty(memberStatus.achievement_note) ? '-' : memberStatus.achievement_note}</td>
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
);

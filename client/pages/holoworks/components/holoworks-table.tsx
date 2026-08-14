import type { HoloworkDisplay } from '../../../../shared/types/holowork';
import type { ReactElement } from 'react';

type HoloworksTableProps = {
  holoworks : Array<HoloworkDisplay>;
  isDisabled: boolean;
  onStart   : (holowork: HoloworkDisplay) => void;
  onComplete: (holowork: HoloworkDisplay) => void;
  onAbort   : (holowork: HoloworkDisplay) => void;
  onDelete  : (holowork: HoloworkDisplay) => void;
};

/** ホロワーク枠一覧テーブル */
export const HoloworksTable = ({ holoworks, isDisabled, onStart, onComplete, onAbort, onDelete }: HoloworksTableProps): ReactElement => (
  <section className="mb-8">
    <h2 className="mb-4 text-lg font-bold">ホロワーク枠一覧</h2>
    
    {holoworks.length === 0 ? (
      <p className="mb-4">登録されているホロワーク枠はありません。</p>
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
                  <td className="px-1 text-center"><button type="button" className="btn btn-xs"           onClick={() => onStart(holowork)}    disabled={isDisabled || hasActiveMembers} >開始</button></td>
                  <td className="px-1 text-center"><button type="button" className="btn btn-xs"           onClick={() => onComplete(holowork)} disabled={isDisabled || !hasActiveMembers}>完了</button></td>
                  <td className="px-1 text-center"><button type="button" className="btn btn-xs"           onClick={() => onAbort(holowork)}    disabled={isDisabled || !hasActiveMembers}>中断</button></td>
                  <td className="px-1 text-center"><button type="button" className="btn btn-xs btn-error" onClick={() => onDelete(holowork)}   disabled={isDisabled || hasActiveMembers} >削除</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

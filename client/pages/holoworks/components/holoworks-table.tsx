import type { HoloworkDisplay } from '../../../../shared/types/app/holowork-display';
import type { ReactElement } from 'react';

/** ホロワーク枠テーブルに渡す一覧と枠操作 */
type HoloworksTableProps = {
  /** 活動中メンバーを含む枠一覧 */
  holoworks : Array<HoloworkDisplay>;
  /** API 操作中に全枠の操作ボタンを非活性にする */
  isDisabled: boolean;
  /** 活動メンバーがいない枠の開始モーダルを開く */
  onStart   : (holowork: HoloworkDisplay) => void;
  /** 活動中の枠を完了する */
  onComplete: (holowork: HoloworkDisplay) => void;
  /** 活動中の枠を回数加算せず中断する */
  onAbort   : (holowork: HoloworkDisplay) => void;
  /** 活動メンバーがいない枠を削除する */
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
              <th className="w-px whitespace-nowrap text-left">枠の名前</th>
              <th className="     whitespace-nowrap text-left">活動中メンバー</th>
              <th className="w-px whitespace-nowrap">開始</th>
              <th className="w-px whitespace-nowrap">完了</th>
              <th className="w-px whitespace-nowrap">中断</th>
              <th className="w-px whitespace-nowrap">削除</th>
            </tr>
          </thead>
          <tbody>
            {holoworks.map(holowork => {
              /** 1枠に対する活動中メンバーの有無・ボタンの活性・非活性処理に利用する */
              const hasActiveMembers = holowork.active_members.length > 0;
              return (
                <tr key={holowork.id}>
                  <td className="w-px whitespace-nowrap">{holowork.name}</td>
                  <td>
                    {hasActiveMembers ? holowork.active_members.map(activeMember => (
                      <div key={activeMember.holomems_id}>{activeMember.holomems_group_name} : {activeMember.holomems_name}</div>
                    )) : '-'}
                  </td>
                  <td className="px-1 whitespace-nowrap text-center"><button type="button" className="btn btn-xs"           onClick={() => onStart(holowork)}    disabled={isDisabled || hasActiveMembers} >開始</button></td>
                  <td className="px-1 whitespace-nowrap text-center"><button type="button" className="btn btn-xs"           onClick={() => onComplete(holowork)} disabled={isDisabled || !hasActiveMembers}>完了</button></td>
                  <td className="px-1 whitespace-nowrap text-center"><button type="button" className="btn btn-xs"           onClick={() => onAbort(holowork)}    disabled={isDisabled || !hasActiveMembers}>中断</button></td>
                  <td className="px-1 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-error" onClick={() => onDelete(holowork)}   disabled={isDisabled || hasActiveMembers} >削除</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

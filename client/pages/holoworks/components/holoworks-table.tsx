import type { HoloworkDisplay } from '../../../../shared/types/app/holowork-display';
import type { ReactElement } from 'react';

/** ホロワーク枠テーブルに渡す一覧と枠操作 */
type HoloworksTableProps = {
  /** 活動中メンバーを含む枠一覧 */
  holoworks : Array<HoloworkDisplay>;
  /** API 操作中か否か・`true` の場合は全枠の操作ボタンを非活性にする */
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
    <h2 className="mb-2 text-lg font-bold">ホロワーク枠一覧</h2>
    
    {holoworks.length === 0 ? (
      <p>登録されているホロワーク枠はありません。</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="table table-xs">
          <thead>
            <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
              <th className="w-px pl-0 pr-1            ">枠の名前</th>
              <th className="     px-1                 ">活動中メンバー</th>
              <th className="w-px px-1      text-center">開始</th>
              <th className="w-px px-1      text-center">完了</th>
              <th className="w-px px-1      text-center">中断</th>
              <th className="w-px pl-1 pr-0 text-center">削除</th>
            </tr>
          </thead>
          <tbody>
            {holoworks.map(holowork => {
              /** 対象枠に活動中メンバーが存在するか否か・各操作ボタンの活性制御に使用する */
              const hasActiveMembers = holowork.active_members.length > 0;
              // 何となく見栄え的に `vertical-align` は `middle` で良い
              return (
                <tr key={holowork.id}>
                  <td className="         pl-0 pr-1      whitespace-nowrap            ">{holowork.name}</td>
                  <td className="min-w-35 px-1                                        ">{hasActiveMembers ? holowork.active_members.map(activeMember => (<div key={activeMember.holomems_id}>{activeMember.holomems_group_name} {activeMember.holomems_name}</div>)) : '-'}</td>
                  <td className="         px-1      py-0 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-info"    onClick={() => onStart(holowork)}    disabled={isDisabled || hasActiveMembers} >開始</button></td>
                  <td className="         px-1      py-0 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-success" onClick={() => onComplete(holowork)} disabled={isDisabled || !hasActiveMembers}>完了</button></td>
                  <td className="         px-1      py-0 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-warning" onClick={() => onAbort(holowork)}    disabled={isDisabled || !hasActiveMembers}>中断</button></td>
                  <td className="         pl-1 pr-0 py-0 whitespace-nowrap text-center"><button type="button" className="btn btn-xs btn-error"   onClick={() => onDelete(holowork)}   disabled={isDisabled || hasActiveMembers} >削除</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

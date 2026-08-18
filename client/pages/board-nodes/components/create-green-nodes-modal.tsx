import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { booleanStringFalse, booleanStringTrue } from '../../../../shared/constants/boolean-constants';
import { boardNodeCategoryGreen } from '../../../../shared/constants/holodori-constants';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { amountDisplayName, createBoardNodesSchema, descriptionDisplayName } from '../../../../shared/schemas/board-node-schema';
import { failedToCreateMessage } from '../../../constants/client-messages';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { Holomem } from '../../../../shared/types/entities/holomem';
import type { BooleanString } from '../../../../shared/types/utilities/boolean-types';
import type { NumberToStringValue } from '../../../../shared/types/utilities/number-types';

/** 緑マス一括追加フォームの1行分の入力値 */
type GreenNodeFormRow = {
  description : string;
  amount      : NumberToStringValue;
  connect_rate: NumberToStringValue;
  is_unlocked : BooleanString;
};

/** 緑マス一括追加モーダルに渡す選択肢と完了通知 */
type CreateGreenNodesModalProps = {
  /** 追加対象として選択できるホロメン一覧 */
  holomems : Array<Pick<Holomem, 'id' | 'group_name' | 'name'>>;
  /** モーダルを閉じる */
  onClose  : () => void;
  /** 追加成功後に親コンポーネントの一覧を再取得する */
  onUpdated: () => Promise<void>;
};

/** 緑マスの初期行に表示するマス効果 */
const initialDescriptions = ['ホッピン・ロープ', 'そろえてクッキング', 'メガサーキット', 'ポカジャン！', 'ホロゴールド', 'メンバー Exp'] as const;

/** 緑マス一括追加フォームの初期値を返す */
const createInitialRows = (): Array<GreenNodeFormRow> => initialDescriptions.map(description => ({
  description : description,
  amount      : '0.50',
  connect_rate: '',
  is_unlocked : booleanStringFalse
}));

/** 緑マス一括追加フォームへ追加する空行を返す */
const createEmptyRow = (): GreenNodeFormRow => ({
  description : '',
  amount      : '',
  connect_rate: '',
  is_unlocked : booleanStringFalse
});

/** 複数の緑マスを一括追加するモーダル */
export const CreateGreenNodesModal = ({ holomems, onClose, onUpdated }: CreateGreenNodesModalProps): ReactElement => {
  const [holomemsId  , setHolomemsId  ] = useState<NumberToStringValue>('');                       // 追加対象のホロメン ID・空文字は未選択
  const [rows        , setRows        ] = useState<Array<GreenNodeFormRow>>(createInitialRows());  // 一括追加フォームの各行
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);                                // 一括追加の送信中か否か
  const [formError   , setFormError   ] = useState<string>('');                                    // バリデーション・API エラー
  
  /** 追加対象のホロメン ID をフォーム State に反映する */
  const onChangeHolomemsId = (event: ChangeEvent<HTMLSelectElement>): void => {
    setHolomemsId(event.target.value as NumberToStringValue);
  };
  
  /** 指定行の入力値をフォーム State に反映する */
  const onChangeRow = (rowIndex: number, event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setRows(prevRows => prevRows.map((row, index) => index === rowIndex ? { ...row, [name]: value } as GreenNodeFormRow : row));
  };
  
  /** 指定行の解放状況をフォーム State に反映する */
  const onChangeIsUnlocked = (rowIndex: number, event: ChangeEvent<HTMLInputElement>): void => {
    setRows(prevRows => prevRows.map((row, index) => index === rowIndex
      ? { ...row, is_unlocked: event.target.checked ? booleanStringTrue : booleanStringFalse }
      : row));
  };
  
  /** 一括追加フォームに空行を追加する */
  const onAddRow = (): void => setRows(prevRows => [...prevRows, createEmptyRow()]);
  
  /** 入力された行を検証して一括追加する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const incompleteRowIndex = rows.findIndex(row => isEmpty(row.description) !== isEmpty(row.amount));
    if(incompleteRowIndex >= 0) return setFormError(`${incompleteRowIndex + 1}行目の${descriptionDisplayName}と${amountDisplayName}を両方入力してください`);
    
    // 解放済みチェックが入っているのに未入力な行があれば入力を促す
    const unlockedIncompleteRowIndex = rows.findIndex(row => row.is_unlocked === booleanStringTrue && (isEmpty(row.description) || isEmpty(row.amount)));
    if(unlockedIncompleteRowIndex >= 0) return setFormError(`${unlockedIncompleteRowIndex + 1}行目は解放済みのため、${descriptionDisplayName}と${amountDisplayName}を両方入力してください`);
    
    const targetRows = rows.filter(row => !isEmpty(row.description) && !isEmpty(row.amount));
    const parsed = createBoardNodesSchema.safeParse({
      board_nodes: targetRows.map(row => ({
        holomems_id  : holomemsId,
        category     : boardNodeCategoryGreen,
        yellow_target: null,
        description  : row.description,
        amount       : row.amount,
        connect_rate : row.connect_rate,
        is_unlocked  : row.is_unlocked
      }))
    });
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.post('/api/board-nodes/bulk', { json: parsed.data });
      
      onClose();  // 先にモーダルを閉じる
      await onUpdated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToCreateMessage('緑マス')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-6xl">
        <h2 className="mb-4 text-lg font-bold">緑マス一括追加</h2>
        
        {!isEmpty(formError) && (
          <div className="alert alert-error alert-soft mb-4">{formError}</div>
        )}
        
        <form onSubmit={onSubmit}>
          <fieldset className="fieldset mb-4">
            <label className="fieldset-label">ホロメン</label>
            <select className="select w-full" name="holomems_id" value={holomemsId} onChange={onChangeHolomemsId} required>
              <option value="">(ホロメンを選択してください)</option>
              {holomems.map(holomem => (
                <option key={holomem.id} value={String(holomem.id)}>{holomem.group_name} : {holomem.name}</option>
              ))}
            </select>
          </fieldset>
          
          <div className="overflow-x-auto mb-2">
            <table className="table table-xs">
              <thead>
                <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                  <th className="     pl-0 pr-1">{descriptionDisplayName}</th>
                  <th className="w-px px-1     ">{amountDisplayName}</th>
                  <th className="w-px px-1     ">コネクト率</th>
                  <th className="w-px pl-1 pr-0">解放</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="[&>td]:align-top">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                    <td className="pl-0 pr-1                    "><input className="input input-xs w-full" type="text"              name="description"  value={row.description}                         onChange={event => onChangeRow(rowIndex, event)} /></td>
                    <td className="px-1                         "><input className="input input-xs w-full" type="number" step="any" name="amount"       value={row.amount}                              onChange={event => onChangeRow(rowIndex, event)} /></td>
                    <td className="px-1                         "><input className="input input-xs w-full" type="number" step="any" name="connect_rate" value={row.connect_rate}                        onChange={event => onChangeRow(rowIndex, event)} /></td>
                    <td className="p-0 text-center !align-middle"><input className="checkbox checkbox-sm"  type="checkbox"                              checked={row.is_unlocked === booleanStringTrue} onChange={event => onChangeIsUnlocked(rowIndex, event)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mb-4 text-right">
            <button type="button" className="btn btn-sm" onClick={onAddRow} disabled={isSubmitting}>行追加</button>
          </div>
          
          <div className="modal-action justify-between">
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>キャンセル</button>
            <button type="submit" className="btn btn-success" disabled={isSubmitting}>追加する</button>
          </div>
        </form>
      </div>
      
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

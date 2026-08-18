import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { boardNodeYellowTargets } from '../../../../shared/constants/app-constants';
import { booleanStringFalse, booleanStringTrue } from '../../../../shared/constants/boolean-constants';
import { boardNodeCategories, boardNodeCategoryYellow } from '../../../../shared/constants/holodori-constants';
import { formatDecimal } from '../../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { amountDisplayName, boardNodeSchema, categoryDisplayName, connectRateDisplayName, descriptionDisplayName, isUnlockedDisplayName, yellowTargetDisplayName } from '../../../../shared/schemas/board-node-schema';
import { failedToCreateMessage, failedToDeleteMessage, failedToUpdateMessage } from '../../../constants/client-messages';
import { categoryNames, yellowTargetNames } from '../../../constants/holodori-constants';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { BoardNode } from '../../../../shared/types/entities/board-node';
import type { Holomem } from '../../../../shared/types/entities/holomem';
import type { BoardNodeCategory, BoardNodeYellowTarget } from '../../../../shared/types/holodori/board-node-types';
import type { BooleanString } from '../../../../shared/types/utilities/boolean-types';
import type { NumberToStringValue } from '../../../../shared/types/utilities/number-types';

/** ホロメンボードマスの新規追加・編集フォームの入力値・数値項目もフォーム要素に合わせて文字列として扱う */
type BoardNodeFormState = {
  holomems_id  : NumberToStringValue;
  category     : BoardNodeCategory;
  /** 未選択時と黄マス以外では空文字とし、Schema で `null` に正規化する */
  yellow_target: BoardNodeYellowTarget | '';
  description  : string;
  is_unlocked  : BooleanString;
  amount       : NumberToStringValue;
  /** 未入力時は空文字とし、Schema で `null` に正規化する */
  connect_rate : NumberToStringValue;
};

/** 単体のボードマス編集モーダルに渡す対象と完了通知 */
type BoardNodeModalProps = {
  /** 編集対象のボードマス・`null` の場合は新規追加として扱う */
  boardNode: BoardNode | null;
  /** 新規追加時の選択肢と編集時の表示に使用するホロメン一覧 */
  holomems : Array<Pick<Holomem, 'id' | 'group_name' | 'name'>>;
  /** モーダルを閉じる */
  onClose  : () => void;
  /** 追加・更新・削除成功後に親コンポーネントの一覧を再取得する */
  onUpdated: () => Promise<void>;
};

/** カテゴリ選択欄の色を表現する CSS クラス名 */
const categoryColourClassSelect: Record<BoardNodeCategory, string> = {
  yellow: 'select-warning',
  green : 'select-success',
  red   : 'select-error',
  blue  : 'select-info'
};

/** 新規追加用の初期フォーム値を返す */
const createEmptyFormValues = (): BoardNodeFormState => ({
  holomems_id  : '',
  category     : boardNodeCategoryYellow,
  yellow_target: '',
  description  : '',
  is_unlocked  : booleanStringFalse,
  amount       : '',
  connect_rate : ''
});

/** 編集対象からフォームの初期値を生成する */
const createFormValues = (boardNode: BoardNode | null): BoardNodeFormState => boardNode == null ? createEmptyFormValues() : {
  holomems_id  : String(boardNode.holomems_id) as NumberToStringValue,
  category     : boardNode.category,
  yellow_target: boardNode.category === boardNodeCategoryYellow ? (boardNode.yellow_target ?? '') : '',
  description  : boardNode.description,
  is_unlocked  : String(boardNode.is_unlocked) as BooleanString,
  amount       : formatDecimal(boardNode.amount) as NumberToStringValue,
  connect_rate : isEmpty(boardNode.connect_rate) ? '' : String(boardNode.connect_rate) as NumberToStringValue
};

/** 単体のホロメンボードマスを新規追加・編集するモーダル */
export const BoardNodeModal = ({ boardNode, holomems, onClose, onUpdated }: BoardNodeModalProps): ReactElement => {
  const [form        , setForm        ] = useState<BoardNodeFormState>(createFormValues(boardNode));  // 新規追加または編集フォームの入力値
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);                                   // 追加・更新・削除の送信中か否か
  const [formError   , setFormError   ] = useState<string>('');                                       // バリデーション・API エラー
  
  /** 編集中のフォームが参照するホロメン。新規追加時または対象を取得できない場合は `null` */
  const editingHolomem = boardNode == null ? null : holomems.find(holomem => holomem.id === Number(form.holomems_id)) ?? null;
  
  /** 変更されたフォーム要素の値を反映し、カテゴリ変更時は黄マス専用項目との整合性を保つ */
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => {
      const newForm = { ...prevForm, [name]: value } as BoardNodeFormState;
      if(name === 'category' && newForm.category !== boardNodeCategoryYellow) newForm.yellow_target = '';
      return newForm;
    });
  };
  
  /** 解放状況チェックボックスの値をフォーム State に反映する */
  const onChangeIsUnlocked = (event: ChangeEvent<HTMLInputElement>): void => {
    setForm(prevForm => ({ ...prevForm, is_unlocked: event.target.checked ? booleanStringTrue : booleanStringFalse }));
  };
  
  /** フォームを検証してボードマスを新規追加または更新し、一覧を再読込する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const payload = { ...form };
    if(payload.category !== boardNodeCategoryYellow) payload.yellow_target = '';  // 黄マス以外の場合に `yellow_target` に不正値が入らないように最終調整する
    const parsed = boardNodeSchema.safeParse(payload);
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      if(boardNode == null) await adminApi.post('/api/board-nodes', { json: parsed.data });
      else await adminApi.patch(`/api/board-nodes/${boardNode.id}`, { json: parsed.data });
      
      onClose();  // 先にモーダルを閉じる
      await onUpdated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, boardNode == null ? failedToCreateMessage('マス') : failedToUpdateMessage('マス')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** `window.confirm()` で確認後、編集中のボードマスを削除して一覧を再読込する */
  const onDelete = async (): Promise<void> => {
    if(boardNode == null) return window.alert('異常 : 削除対象のマスが選択されていません');
    if(!window.confirm('このマスを削除しますか？')) return;
    
    setFormError('');
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/board-nodes/${boardNode.id}`);
      
      onClose();  // 先にモーダルを閉じる
      await onUpdated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToDeleteMessage('マス')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h2 className="mb-4 text-lg font-bold">{boardNode == null ? '新規マス追加' : `マス編集 (ID : ${boardNode.id})`}</h2>
        
        {!isEmpty(formError) && (
          <div className="alert alert-error alert-soft mb-4">{formError}</div>
        )}
        
        <form onSubmit={onSubmit}>
          <fieldset className="fieldset">
            {/* 新規追加時はホロメンをセレクトボックスで選択・編集時は参照のみで変更不可 */}
            <label className="fieldset-label">ホロメン</label>
            {boardNode == null ? (
              <select className="select w-full" name="holomems_id" value={form.holomems_id} onChange={onChangeForm} required>
                <option value="">(ホロメンを選択してください)</option>
                {holomems.map(holomem => (
                  <option key={holomem.id} value={String(holomem.id)}>{holomem.group_name} : {holomem.name}</option>
                ))}
              </select>
            ) : (
              <p>{editingHolomem == null ? '' : `${editingHolomem.group_name} : ${editingHolomem.name}`}</p>
            )}
            
            {/* カテゴリは新規登録時のみ設定可能・編集時は参照のみで変更不可 */}
            <label className="fieldset-label">{categoryDisplayName}</label>
            <select className={`select w-full ${categoryColourClassSelect[form.category]}`} name="category" value={form.category} onChange={onChangeForm} disabled={boardNode != null}>
              {boardNodeCategories.map(category => (
                <option key={category} value={category}>{categoryNames[category]}</option>
              ))}
            </select>
            
            {/* 黄マス時の報酬アップ対象アイテムは新規登録時のみ設定可能・編集時は参照のみで変更不可 */}
            <label className="fieldset-label">{yellowTargetDisplayName}</label>
            <select className="select w-full" name="yellow_target" value={form.yellow_target} onChange={onChangeForm} disabled={boardNode != null || form.category !== boardNodeCategoryYellow}>
              <option value="">(選択してください)</option>
              {boardNodeYellowTargets.map(yellowTarget => (
                <option key={yellowTarget} value={yellowTarget}>{yellowTargetNames[yellowTarget]}</option>
              ))}
            </select>
            
            <label className="fieldset-label">{descriptionDisplayName}</label>
            <textarea className="textarea w-full min-h-24" name="description" value={form.description} onChange={onChangeForm} required />
            
            <label className="fieldset-label">{amountDisplayName}</label>
            <input className="input w-full" name="amount" type="number" step="any" value={form.amount} onChange={onChangeForm} required />
            
            <label className="fieldset-label">{connectRateDisplayName}</label>
            <input className="input w-full" name="connect_rate" type="number" step="any" value={form.connect_rate} onChange={onChangeForm} />
            
            <label className="fieldset-label">{isUnlockedDisplayName}</label>
            <input className="checkbox" type="checkbox" name="is_unlocked" checked={form.is_unlocked === booleanStringTrue} onChange={onChangeIsUnlocked} />
          </fieldset>
          
          <div className="modal-action justify-between">
            {boardNode != null && (<button type="button" className="btn btn-error" onClick={onDelete} disabled={isSubmitting}>削除する</button>)}
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>キャンセル</button>
            <button type="submit" className="btn btn-info" disabled={isSubmitting}>{boardNode == null ? '追加する' : '更新する'}</button>
          </div>
        </form>
      </div>
      
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

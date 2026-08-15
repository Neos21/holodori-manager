import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { holoworkNameDisplayName, holoworkSchema } from '../../../../shared/schemas/holowork-schema';
import { failedToCreateMessage } from '../../../constants/client-messages';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

/** 新規ホロワーク枠追加モーダルに渡す値と完了通知 */
type CreateHoloworkModalProps = {
  /** モーダルを閉じる */
  onClose  : () => void;
  /** 追加成功後に親コンポーネントで一覧を再取得する */
  onCreated: () => Promise<void>;
};

/** 新規ホロワーク枠追加モーダル */
export const CreateHoloworkModal = ({ onClose, onCreated }: CreateHoloworkModalProps): ReactElement => {
  const [holoworkName, setHoloworkName] = useState<string>('');   // 入力中の枠名
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);  // 二重送信防止用に参照する Submit 中か否か
  const [formError   , setFormError   ] = useState<string>('');  // バリデーション・API エラー
  
  /** 枠名の入力値を State に反映する */
  const onChangeHoloworkName = (event: ChangeEvent<HTMLInputElement>): void => setHoloworkName(event.target.value);
  
  /** 入力値を検証してホロワーク枠を追加する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const parsed = holoworkSchema.safeParse({ name: holoworkName });
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.post('/api/holoworks', { json: parsed.data }).json<{ result: { id: number; }; }>();
      // 先にモーダルを破棄してから再取得処理を呼び出す
      setIsSubmitting(false);
      onClose();
      await onCreated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToCreateMessage('ホロワーク枠')));
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h2 className="mb-4 text-lg font-bold">新規ホロワーク枠追加</h2>
        
        <form onSubmit={onSubmit}>
          <fieldset className="fieldset">
            <label className="fieldset-label">{holoworkNameDisplayName}</label>
            <input className="input w-full" name="name" type="text" value={holoworkName} onChange={onChangeHoloworkName} required />
          </fieldset>
          
          {!isEmpty(formError) && (
            <div className="alert alert-error alert-soft mb-4">{formError}</div>
          )}
          
          <div className="modal-action justify-between">
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>キャンセル</button>
            <button type="submit" className="btn btn-info" disabled={isSubmitting}>追加する</button>
          </div>
        </form>
      </div>
      
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

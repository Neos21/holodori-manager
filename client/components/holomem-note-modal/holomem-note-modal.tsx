import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { holomemSchema, noteDisplayName } from '../../../shared/schemas/holomem-schema';
import { failedToUpdateMessage } from '../../constants/client-messages';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { Holomem } from '../../../shared/types/entities/holomem';

/** ホロメンメモ編集モーダルに渡す対象と完了通知 */
type HolomemNoteModalProps = {
  /** 編集対象のホロメン */
  holomem  : Pick<Holomem, 'id' | 'group_name' | 'name' | 'note'>;
  /** モーダルを閉じる */
  onClose  : () => void;
  /** 更新成功後に呼び出し元に処理を戻す・`holomems-store` のキャッシュを `reloadHolomems()` で更新する必要がある */
  onUpdated: () => Promise<void>;
};

/** ホロメンメモ編集モーダル */
export const HolomemNoteModal = ({ holomem, onClose, onUpdated }: HolomemNoteModalProps): ReactElement => {
  const [note        , setNote        ] = useState<string>(holomem.note ?? '');  // 編集中のホロメンメモ・未入力時は空文字
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);              // ホロメンメモ送信中か否か
  const [formError   , setFormError   ] = useState<string>('');                  // バリデーション・API エラー
  
  /** 変更されたホロメンメモの値をフォーム State に反映する */
  const onChangeNote = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setNote(event.target.value);
  };
  
  /** ホロメンメモを検証して更新し、呼び出し元の一覧を再取得する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const parsed = holomemSchema.pick({ note: true }).safeParse({ note });
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.patch(`/api/holomems/${holomem.id}`, { json: parsed.data });
      onClose();  // 先にモーダルを閉じる
      await onUpdated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToUpdateMessage('ホロメンメモ')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h2 className="mb-4 text-lg font-bold">ホロメンメモ編集</h2>
        
        {!isEmpty(formError) && (
          <div className="alert alert-error alert-soft mb-4">{formError}</div>
        )}
        
        <form onSubmit={onSubmit}>
          <fieldset className="fieldset">
            <label className="fieldset-label">ホロメン</label>
            <p>{holomem.group_name} : {holomem.name}</p>
            
            <label className="fieldset-label">{noteDisplayName}</label>
            <textarea className="textarea w-full min-h-24" name="note" value={note} onChange={onChangeNote} />
          </fieldset>
          
          <div className="modal-action justify-between">
            <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>キャンセル</button>
            <button type="submit" className="btn btn-info" disabled={isSubmitting}>更新する</button>
          </div>
        </form>
      </div>
      
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

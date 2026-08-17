import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { currentCountDisplayName, holoworkAchievementSchema } from '../../../../shared/schemas/holowork-achievement-schema';
import { failedToUpdateMessage } from '../../../constants/client-messages';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { Holomem } from '../../../../shared/types/entities/holomem';
import type { HoloworkAchievement } from '../../../../shared/types/entities/holowork-achievement';

/** ホロワーク達成状況編集モーダルに渡す対象と完了通知 */
type HoloworkAchievementModalProps = {
  /** 編集対象のホロメン */
  holomem            : Pick<Holomem, 'id' | 'group_name' | 'name'>;
  /** 編集対象のホロワーク達成状況 */
  holoworkAchievement: Pick<HoloworkAchievement, 'id' | 'current_count'>;
  /** モーダルを閉じる */
  onClose            : () => void;
  /** 更新成功後に親コンポーネントでメンバー状況を再取得する */
  onUpdated          : () => Promise<void>;
};

/** ホロワーク達成状況編集モーダル */
export const HoloworkAchievementModal = ({ holomem, holoworkAchievement, onClose, onUpdated }: HoloworkAchievementModalProps): ReactElement => {
  const [currentCount, setCurrentCount] = useState<string>(String(holoworkAchievement.current_count));  // 編集中のホロワーク完了回数
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);                                     // 達成状況更新の送信中か否か
  const [formError   , setFormError   ] = useState<string>('');                                         // バリデーション・API エラー
  
  /** 完了回数の入力値をフォーム State に反映する */
  const onChangeCurrentCount = (event: ChangeEvent<HTMLInputElement>): void => {
    setCurrentCount(event.target.value);
  };
  
  /** 入力値を検証して対象の達成状況を更新する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const parsed = holoworkAchievementSchema.pick({ current_count: true }).safeParse({ current_count: currentCount });
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.patch(`/api/holowork-achievements/${holoworkAchievement.id}`, { json: parsed.data });
      onClose();  // 先にモーダルを閉じる
      await onUpdated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToUpdateMessage('ホロワーク達成状況')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h2 className="mb-4 text-lg font-bold">ホロワーク達成状況編集</h2>
        
        <form onSubmit={onSubmit}>
          <fieldset className="fieldset">
            <label className="fieldset-label">ホロメン</label>
            <p>{holomem.group_name} : {holomem.name}</p>
            
            <label className="fieldset-label">{currentCountDisplayName}</label>
            <input className="input w-full" name="current_count" type="number" min="0" step="1" value={currentCount} onChange={onChangeCurrentCount} required />
          </fieldset>
          
          {!isEmpty(formError) && (
            <div className="alert alert-error alert-soft mb-4">{formError}</div>
          )}
          
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

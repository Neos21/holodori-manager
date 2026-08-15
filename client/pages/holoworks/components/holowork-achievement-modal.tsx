import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { achievementNoteDisplayName, currentCountDisplayName, holoworkAchievementSchema } from '../../../../shared/schemas/holowork-achievement-schema';
import { failedToUpdateMessage } from '../../../constants/client-messages';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { HoloworkMemberStatus } from '../../../../shared/types/holowork-member-status';
import type { NumberToStringValue } from '../../../../shared/types/number-types';

/** ホロワーク達成状況編集モーダルに渡す対象と完了通知 */
type HoloworkAchievementModalProps = {
  /** 編集対象のホロメン別ステータス */
  memberStatus: HoloworkMemberStatus;
  /** モーダルを閉じる */
  onClose     : () => void;
  /** 更新成功後に親コンポーネントでメンバー状況を再取得する */
  onUpdated   : () => Promise<void>;
};

/** ホロワーク達成状況編集フォームの型定義 */
type AchievementFormState = {
  /** 編集中のホロワーク完了回数 */
  current_count: NumberToStringValue;
  /** 編集中の達成状況メモ・未入力時は空文字 */
  note         : string;
};

/** 達成状況編集で更新を許可する項目だけに限定したスキーマ */
const achievementFormSchema = holoworkAchievementSchema.pick({ current_count: true, note: true });

/** ホロワーク達成状況編集モーダル */
export const HoloworkAchievementModal = ({ memberStatus, onClose, onUpdated }: HoloworkAchievementModalProps): ReactElement => {
  const [form, setForm] = useState<AchievementFormState>({  // 編集対象の現在値から生成するフォーム
    current_count: String(memberStatus.current_count) as NumberToStringValue,
    note         : memberStatus.achievement_note ?? ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);  // 二重送信防止用に参照する Submit 中か否か
  const [formError   , setFormError   ] = useState<string>('');  // バリデーション・API エラー
  
  /** 完了回数またはメモの入力値をフォーム State に反映する */
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }) as AchievementFormState);
  };
  
  /** 入力値を検証して対象の達成状況を更新する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const parsed = achievementFormSchema.safeParse(form);
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.patch(`/api/holowork-achievements/${memberStatus.holowork_achievements_id}`, { json: parsed.data });
      setIsSubmitting(false);
      // 先にモーダルを破棄してから再取得処理を呼び出す
      onClose();
      await onUpdated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToUpdateMessage('ホロワーク達成状況')));
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
            <input className="input w-full" type="text" value={`${memberStatus.holomems_group_name} : ${memberStatus.holomems_name}`} readOnly disabled />
            
            <label className="fieldset-label">{currentCountDisplayName}</label>
            <input className="input w-full" name="current_count" type="number" min="0" step="1" value={form.current_count} onChange={onChangeForm} required />
            
            <label className="fieldset-label">{achievementNoteDisplayName}</label>
            <textarea className="textarea w-full" name="note" value={form.note} onChange={onChangeForm} />
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

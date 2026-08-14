import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { achievementNoteDisplayName, currentCountDisplayName, holoworkAchievementSchema } from '../../../../shared/schemas/holowork-achievement-schema';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { HoloworkMemberStatus } from '../../../../shared/types/holowork-member-status';
import type { NumberToStringValue } from '../../../../shared/types/number-types';

type HoloworkAchievementModalProps = {
  memberStatus: HoloworkMemberStatus;
  onClose     : () => void;
  onUpdated   : () => Promise<void>;
};

type AchievementFormState = {
  current_count: NumberToStringValue;
  note         : string;
};

const achievementFormSchema = holoworkAchievementSchema.pick({ current_count: true, note: true });

/** ホロワーク達成状況編集モーダル */
export const HoloworkAchievementModal = ({ memberStatus, onClose, onUpdated }: HoloworkAchievementModalProps): ReactElement => {
  const [form, setForm] = useState<AchievementFormState>({
    current_count: String(memberStatus.current_count) as NumberToStringValue,
    note         : memberStatus.achievement_note ?? ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError   , setFormError   ] = useState<string>('');
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => ({ ...prevForm, [name]: value }) as AchievementFormState);
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const parsed = achievementFormSchema.safeParse(form);
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.patch(`/api/holowork-achievements/${memberStatus.holowork_achievements_id}`, { json: parsed.data });
      setIsSubmitting(false);
      // 再表示時に最新値からフォームを作り直せるよう、更新後は先にモーダルを破棄する
      onClose();
      await onUpdated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, 'ホロワーク達成状況の更新に失敗しました'));
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

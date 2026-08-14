import { type ChangeEvent, type ReactElement, type SubmitEvent, useState } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { holoworkNameDisplayName, holoworkSchema } from '../../../../shared/schemas/holowork-schema';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

type CreateHoloworkModalProps = {
  onClose  : () => void;
  onCreated: () => Promise<void>;
};

/** 新規ホロワーク枠追加モーダル */
export const CreateHoloworkModal = ({ onClose, onCreated }: CreateHoloworkModalProps): ReactElement => {
  const [holoworkName, setHoloworkName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError   , setFormError   ] = useState<string>('');
  
  const onChangeHoloworkName = (event: ChangeEvent<HTMLInputElement>): void => setHoloworkName(event.target.value);
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const parsed = holoworkSchema.safeParse({ name: holoworkName });
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.post('/api/holoworks', { json: parsed.data }).json<{ result: { id: number; }; }>();
      setIsSubmitting(false);
      onClose();
      await onCreated();
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, 'ホロワーク枠の追加に失敗しました'));
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

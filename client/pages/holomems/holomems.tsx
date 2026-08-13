import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { booleanNumberTrue, booleanStringFalse, booleanStringTrue } from '../../../shared/constants/boolean-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { groupNameDisplayName, isActiveDisplayName, nameDisplayName, noteDisplayName, sortOrderDisplayName, holomemSchema } from '../../../shared/schemas/holomem-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { BooleanString } from '../../../shared/types/boolean-types';
import type { Holomem } from '../../../shared/types/holomem';

/** ホロメンの新規追加・編集フォームの型定義 : 全て String で扱う */
type HolomemFormState = {
  sort_order: string;
  group_name: string;
  name      : string;
  note      : string;
  is_active : BooleanString;
};

/** 空のフォーム値を返す */
const createEmptyFormValues = (): HolomemFormState => ({
  sort_order: '',
  group_name: '',
  name      : '',
  note      : '',
  is_active : booleanStringTrue  // ホロメンの状態を示す初期値は「有効」としておく
});

export default function HolomemsPage(): ReactElement {
  const [isLoading             , setIsLoading             ] = useState<boolean>(true);
  const [holomems              , setHolomems              ] = useState<Array<Holomem>>([]);
  const [expandedNoteHolomemIds, setExpandedNoteHolomemIds] = useState<Array<number>>([]);  // メモ欄を開いた状態を保持するための State
  const [listError             , setListError             ] = useState<string>('');
  
  const [isModalOpen , setIsModalOpen ] = useState<boolean>(false);
  const [form        , setForm        ] = useState<HolomemFormState>(createEmptyFormValues());
  const [editingId   , setEditingId   ] = useState<number | null>(null);  // `null` なら新規追加としてフォームを扱う
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError   , setFormError   ] = useState<string>('');
  
  const onLoadHolomems = async (): Promise<void> => {
    setListError('');
    try {
      const response = await adminApi.get('/api/holomems').json<{ result: Array<Holomem>; }>();
      setHolomems(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'ホロメン一覧の取得に失敗しました'));
    }
  };
  
  // 画面初期表示時
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await onLoadHolomems();
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  /** フォーム情報をリセットする */
  const resetForm = (): void => {
    setEditingId(null);
    setForm(createEmptyFormValues());
  };
  
  /** 新規追加ボタン押下時 */
  const onStartCreate = (): void => {
    resetForm();
    setFormError('');
    setIsModalOpen(true);
  };
  
  /** 編集ボタン押下時 */
  const onStartEdit = (holomem: Holomem): void => {
    setEditingId(holomem.id);
    setForm({
      sort_order: String(holomem.sort_order),
      group_name: holomem.group_name,
      name      : holomem.name,
      note      : holomem.note ?? '',
      is_active : String(holomem.is_active) as BooleanString
    });
    setFormError('');
    setIsModalOpen(true);
  };
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => ({ ...prevForm, [name]: value } as HolomemFormState));
  };
  
  const onCloseModal = (): void => {
    resetForm();
    setFormError('');
    setIsModalOpen(false);
  };
  
  /** メモ欄の開閉を管理する */
  const onToggleNote = (holomemId: number): void => {
    setExpandedNoteHolomemIds(prevExpandedNoteHolomemIds => prevExpandedNoteHolomemIds.includes(holomemId)
      ? prevExpandedNoteHolomemIds.filter(id => id !== holomemId)
      : [...prevExpandedNoteHolomemIds, holomemId]);
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const payload = { ...form };
    const parsed = holomemSchema.safeParse(payload);
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      // 新規追加か編集かで呼び分ける
      if(editingId == null) {
        await adminApi.post('/api/holomems', { json: parsed.data }).json<{ result: { id: number; }; }>();
      }
      else {
        await adminApi.patch(`/api/holomems/${editingId}`, { json: parsed.data });
      }
      
      setIsModalOpen(false);  // 先にモーダルを閉じる
      resetForm();  // フォームをリセットしておく
      await onLoadHolomems();  // 一覧を再読込する
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, editingId == null ? 'ホロメンの追加に失敗しました' : 'ホロメンの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main>
      <h1>ホロメン一覧</h1>
      
      {!isEmpty(listError) && (
        <div className="alert alert-error alert-soft mb-4">{listError}</div>
      )}
      
      {isLoading ? (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      ) : (
        <>
          {holomems.length === 0 ? (
            <p className="mb-4">登録されているホロメンはありません。</p>
          ) : (
            <div className="mb-4 overflow-x-auto">
              <table className="table table-xs w-full">
                <thead>
                  <tr className="text-center">
                    <th className="w-px           pl-0 pr-1 whitespace-nowrap">No</th>
                    <th className="w-px           px-1      whitespace-nowrap">{groupNameDisplayName}</th>
                    <th className="w-px           px-1      whitespace-nowrap">{nameDisplayName}</th>
                    <th className="w-full min-w-0 pl-1 pr-0">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {holomems.map(holomem => (
                    <tr key={holomem.id} className={`[&>td] : align-top ${holomem.is_active === booleanNumberTrue ? '' : 'bg-base-200'}`}>
                      <td className="w-px pl-0 pr-1 text-center whitespace-nowrap">
                        <button type="button" className="btn btn-xs w-full" onClick={() => onStartEdit(holomem)}>{holomem.sort_order}</button>
                      </td>
                      <td className="w-px px-1 whitespace-nowrap">{holomem.group_name}</td>
                      <td className="w-px px-1 whitespace-nowrap">{holomem.name}</td>
                      <td className="w-full min-w-40 pl-1 pr-0">
                        {isEmpty(holomem.note) ? '-' : (
                          <div
                            className={`cursor-pointer ${expandedNoteHolomemIds.includes(holomem.id) ? 'whitespace-pre-wrap' : 'line-clamp-1'}`}
                            onClick={() => onToggleNote(holomem.id)}
                          >
                            {holomem.note}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="text-right">
            <button type="button" className="btn btn-info" onClick={onStartCreate}>新規ホロメン追加</button>
          </div>
        </>
      )}
      
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h2 className="mb-4 text-lg font-bold">{editingId == null ? '新規ホロメン追加' : `ホロメン編集 (ID : ${editingId})`}</h2>
            
            {!isEmpty(formError) && (
              <div className="alert alert-error alert-soft mb-4">{formError}</div>
            )}
            
            <form onSubmit={onSubmit}>
              <fieldset className="fieldset">
                <label className="fieldset-label">{sortOrderDisplayName}</label>
                <input className="input w-full" name="sort_order" type="number" min={1} value={form.sort_order} onChange={onChangeForm} required />
                
                <label className="fieldset-label">{groupNameDisplayName}</label>
                <input className="input w-full" name="group_name" type="text" value={form.group_name} onChange={onChangeForm} required />
                
                <label className="fieldset-label">{nameDisplayName}</label>
                <input className="input w-full" name="name" type="text" value={form.name} onChange={onChangeForm} required />
                
                <label className="fieldset-label">{noteDisplayName}</label>
                <textarea className="textarea w-full min-h-32" name="note" value={form.note} onChange={onChangeForm} />
                
                <label className="fieldset-label">{isActiveDisplayName}</label>
                <select className="select w-full" name="is_active" value={form.is_active} onChange={onChangeForm}>
                  <option value={booleanStringTrue}>有効</option>
                  <option value={booleanStringFalse}>卒業</option>
                </select>
              </fieldset>
              
              <div className="modal-action justify-between">
                <button type="button" className="btn" onClick={onCloseModal} disabled={isSubmitting}>キャンセル</button>
                <button type="submit" className="btn btn-info" disabled={isSubmitting}>{editingId == null ? '追加する' : '更新する'}</button>
              </div>
            </form>
          </div>
          
          <div className="modal-backdrop" onClick={onCloseModal} />
        </div>
      )}
    </main>
  );
}

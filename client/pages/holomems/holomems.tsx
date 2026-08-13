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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [holomems , setHolomems ] = useState<Array<Holomem>>([]);
  
  const [form        , setForm        ] = useState<HolomemFormState>(createEmptyFormValues());
  const [editingId   , setEditingId   ] = useState<number | null>(null);  // `null` なら新規追加としてフォームを扱う
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const onLoadHolomems = async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holomems').json<{ result: Array<Holomem>; }>();
      setHolomems(response.result);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ホロメン一覧の取得に失敗しました'));
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
  
  const onStartEditHolomem = (holomem: Holomem): void => {
    setEditingId(holomem.id);
    setForm({
      sort_order: String(holomem.sort_order),
      group_name: holomem.group_name,
      name      : holomem.name,
      note      : holomem.note ?? '',
      is_active : String(holomem.is_active) as BooleanString
    });
    setErrorMessage('');
  };
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => ({ ...prevForm, [name]: value } as HolomemFormState));
  };
  
  const onResetForm = (): void => {
    setEditingId(null);
    setForm(createEmptyFormValues());
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const payload = { ...form };
    const parsed = holomemSchema.safeParse(payload);
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      // 新規追加か編集かで呼び分ける
      if(editingId == null) {
        await adminApi.post('/api/holomems', { json: parsed.data }).json<{ result: { id: number; }; }>();
      }
      else {
        await adminApi.patch(`/api/holomems/${editingId}`, { json: parsed.data });
      }
      
      await onLoadHolomems();
      onResetForm();
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, editingId == null ? 'ホロメンの追加に失敗しました' : 'ホロメンの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main>
      <h1>ホロメン一覧</h1>
      
      <section>
        <h2>{editingId == null ? '新規追加' : '編集'}</h2>
        
        <form onSubmit={onSubmit}>
          <div>
            <label>
              {sortOrderDisplayName}
              <input name="sort_order" type="number" min={1} value={form.sort_order} onChange={onChangeForm} required />
            </label>
            
            <label>
              {groupNameDisplayName}
              <input name="group_name" type="text" value={form.group_name} onChange={onChangeForm} required />
            </label>
            
            <label>
              {nameDisplayName}
              <input name="name" type="text" value={form.name} onChange={onChangeForm} required />
            </label>
            
            <label>
              {noteDisplayName}
              <textarea name="note" value={form.note} onChange={onChangeForm} />
            </label>
            
            <label>
              {isActiveDisplayName}
              <select name="is_active" value={form.is_active} onChange={onChangeForm}>
                <option value={booleanStringTrue}>有効</option>
                <option value={booleanStringFalse}>卒業</option>
              </select>
            </label>
          </div>
          
          <div>
            <button type="submit" disabled={isSubmitting}>{editingId == null ? '追加する' : '更新する'}</button>
            
            <button type="button" onClick={onResetForm} disabled={isSubmitting}>キャンセル</button>
          </div>
        </form>
      </section>
      
      {!isEmpty(errorMessage) && (
        <div className="alert-danger">{errorMessage}</div>
      )}
      
      {isLoading ? (
        <div className="label-warning">読込中…</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>{groupNameDisplayName}</th>
              <th>{nameDisplayName}</th>
              <th>{isActiveDisplayName}</th>
              <th>{noteDisplayName}</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {/* TODO : note は pre-wrap 表示にしつつ行数がかさんでたら開閉できるようにする */}
            {holomems.map(holomem => (
              <tr key={holomem.id}>
                <td>{holomem.sort_order}</td>
                <td>{holomem.group_name}</td>
                <td>{holomem.name}</td>
                <td>{holomem.is_active === booleanNumberTrue ? '-' : '卒業'}</td>
                <td>{holomem.note ?? '—'}</td>
                <td><button type="button" onClick={() => onStartEditHolomem(holomem)}>編集</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

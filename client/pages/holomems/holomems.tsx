import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { holomemSchema } from '../../../shared/schemas/holomem-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { Holomem } from '../../../shared/types/holomem';

type HolomemFormState = {
  sort_order: string;
  group: string;
  name: string;
  note: string;
  is_active: '0' | '1';
};

const emptyForm = (): HolomemFormState => ({
  sort_order: '',
  group: '',
  name: '',
  note: '',
  is_active: '1'
});

export default function HolomemsPage(): ReactElement {
  const [holomems, setHolomems] = useState<Array<Holomem>>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<HolomemFormState>(emptyForm());
  
  const onLoadHolomems = async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/holomems').json<{ result: Array<Holomem>; }>();
      setHolomems(response.result);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ホロメン一覧の取得に失敗しました'));
    }
  };
  
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
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setForm(current => ({
      ...current,
      [name]: value
    } as HolomemFormState));
  };
  
  const onResetForm = (): void => {
    setEditingId(null);
    setForm(emptyForm());
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    if(isEmpty(form.group)) {
      setErrorMessage('所属グループを入力してください');
      return;
    }
    
    if(isEmpty(form.name)) {
      setErrorMessage('タレント名を入力してください');
      return;
    }
    
    const payload = {
      sort_order: form.sort_order,
      group: form.group.trim(),
      name: form.name.trim(),
      note: isEmpty(form.note) ? null : form.note.trim(),
      is_active: form.is_active
    };
    const parsed = holomemSchema.safeParse(payload);
    if(!parsed.success) {
      setErrorMessage(mergeIssues(parsed.error));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
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
  
  const onEditHolomem = (holomem: Holomem): void => {
    setEditingId(holomem.id);
    setForm({
      sort_order: String(holomem.sort_order),
      group: holomem.group,
      name: holomem.name,
      note: holomem.note ?? '',
      is_active: String(holomem.is_active) as '0' | '1'
    });
    setErrorMessage('');
  };
  
  return (
    <main>
      <h1>ホロメン一覧</h1>
      
      <section>
        <h2>{editingId == null ? '新規追加' : '編集'}</h2>
        
        <form onSubmit={onSubmit}>
          <div>
            <label>
              表示順
              <input name="sort_order" type="number" min={1} value={form.sort_order} onChange={onChangeForm} required />
            </label>
            
            <label>
              状態
              <select name="is_active" value={form.is_active} onChange={onChangeForm}>
                <option value="1">有効</option>
                <option value="0">卒業</option>
              </select>
            </label>
            
            <label>
              所属グループ
              <input name="group" type="text" value={form.group} onChange={onChangeForm} required />
            </label>
            
            <label>
              タレント名
              <input name="name" type="text" value={form.name} onChange={onChangeForm} required />
            </label>
            
            <label>
              備考
              <textarea name="note" value={form.note} onChange={onChangeForm} />
            </label>
          </div>
          
          <div>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : editingId == null ? '追加する' : '更新する'}
            </button>
            
            <button type="button" onClick={onResetForm} disabled={isSubmitting}>
              キャンセル
            </button>
          </div>
        </form>
      </section>
      
      {errorMessage && (
        <div className="alert-danger">{errorMessage}</div>
      )}
      
      {isLoading ? (
        <div className="label-warning">読み込み中...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>グループ</th>
              <th>名前</th>
              <th>状態</th>
              <th>備考</th>
              <th>操作</th>
            </tr>
          </thead>
          
          <tbody>
            {holomems.map(holomem => (
              <tr key={holomem.id}>
                <td>{holomem.group}</td>
                <td>{holomem.name}</td>
                <td>{holomem.is_active === 0 ? '卒業' : '-'}</td>
                <td>{holomem.note ?? '—'}</td>
                <td>
                  <button type="button" onClick={() => onEditHolomem(holomem)}>
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

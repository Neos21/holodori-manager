import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { blooms, rarities } from '../../../shared/constants/holodori-constants';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { cardSchema } from '../../../shared/schemas/card-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { CardDisplay } from '../../../shared/types/card';

type CardStringValue = `${number}` | '';
type CardFormState = {
  holomems_id: CardStringValue;
  rarity: `${(typeof rarities)[number]}`;
  name: string;
  is_owned: '0' | '1';
  level: CardStringValue;
  bloom: `${(typeof blooms)[number]}`;
};

const rarityOptions = [...rarities].reverse() as Array<(typeof rarities)[number]>;
const bloomOptions = [...blooms] as Array<(typeof blooms)[number]>;

const emptyForm = (): CardFormState => ({
  holomems_id: '',
  rarity: '5',
  name: '',
  is_owned: '1',
  level: '',
  bloom: '0'
});

export default function CardsPage(): ReactElement {
  const [cards, setCards] = useState<Array<CardDisplay>>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CardFormState>(emptyForm());
  
  const onLoadCards = async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/cards').json<{ result: Array<CardDisplay>; }>();
      setCards(response.result);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'カード一覧の取得に失敗しました'));
    }
  };
  
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      
      try {
        await onLoadCards();
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setForm(current => ({
      ...current,
      [name]: value
    } as CardFormState));
  };
  
  const onResetForm = (): void => {
    setEditingId(null);
    setForm(emptyForm());
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const payload = {
      holomems_id: Number(form.holomems_id),
      rarity: Number(form.rarity),
      name: form.name.trim(),
      is_owned: Number(form.is_owned),
      level: Number(form.level),
      bloom: Number(form.bloom)
    };
    const parsed = cardSchema.safeParse(payload);
    if(!parsed.success) {
      setErrorMessage(mergeIssues(parsed.error));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if(editingId == null) {
        await adminApi.post('/api/cards', { json: parsed.data }).json<{ result: { id: number; }; }>();
      }
      else {
        await adminApi.patch(`/api/cards/${editingId}`, { json: parsed.data });
      }
      
      await onLoadCards();
      onResetForm();
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, editingId == null ? 'カードの追加に失敗しました' : 'カードの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onEditCard = (card: CardDisplay): void => {
    setEditingId(card.id);
    setForm({
      holomems_id: String(card.holomems_id) as CardStringValue,
      rarity: String(card.rarity) as `${(typeof rarities)[number]}`,
      name: card.name,
      is_owned: String(card.is_owned) as '0' | '1',
      level: String(card.level) as CardStringValue,
      bloom: String(card.bloom) as `${(typeof blooms)[number]}`
    });
    setErrorMessage('');
  };
  
  return (
    <main>
      <h1>カード一覧</h1>
      
      <section>
        <h2>{editingId == null ? '新規追加' : '編集'}</h2>
        
        <form onSubmit={onSubmit}>
          <div>
            <label>
              ホロメン ID
              <input name="holomems_id" type="number" min={1} value={form.holomems_id} onChange={onChangeForm} required />
            </label>
            
            <label>
              レア度
              <select name="rarity" value={form.rarity} onChange={onChangeForm}>
                {rarityOptions.map(rarity => (
                  <option key={rarity} value={String(rarity)}>
                    {rarity}
                  </option>
                ))}
              </select>
            </label>
            
            <label>
              カード名
              <input name="name" type="text" value={form.name} onChange={onChangeForm} required />
            </label>
            
            <label>
              所持状況
              <select name="is_owned" value={form.is_owned} onChange={onChangeForm}>
                <option value="1">所持</option>
                <option value="0">未所持</option>
              </select>
            </label>
            
            <label>
              レベル
              <input name="level" type="number" min={1} value={form.level} onChange={onChangeForm} required />
            </label>
            
            <label>
              開花度
              <select name="bloom" value={form.bloom} onChange={onChangeForm}>
                {bloomOptions.map(bloom => (
                  <option key={bloom} value={String(bloom)}>
                    {bloom}
                  </option>
                ))}
              </select>
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
              <th>ホロメン</th>
              <th>レア度</th>
              <th>カード名</th>
              <th>所持</th>
              <th>レベル</th>
              <th>開花度</th>
              <th>操作</th>
            </tr>
          </thead>
          
          <tbody>
            {cards.map(card => (
              <tr key={card.id}>
                <td>{card.holomem_name}</td>
                <td>{card.rarity}</td>
                <td>{card.name}</td>
                <td>{card.is_owned === 0 ? '未所持' : '所持'}</td>
                <td>{card.level}</td>
                <td>{card.bloom}</td>
                <td>
                  <button type="button" onClick={() => onEditCard(card)}>
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

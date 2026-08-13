import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { booleanNumberTrue, booleanStringFalse, booleanStringTrue } from '../../../shared/constants/boolean-constants';
import { bloom0, blooms, rarities, star5 } from '../../../shared/constants/holodori-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { cardSchema } from '../../../shared/schemas/card-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { BooleanString } from '../../../shared/types/boolean-types';
import type { CardDisplay } from '../../../shared/types/card';

/** Number 型の項目を String 型で扱うための型定義 */
type NumberToStringValue = `${number}` | '';

/** カードの新規追加・編集フォームの型定義 */
type CardFormState = {
  holomems_id: NumberToStringValue;
  rarity     : `${(typeof rarities)[number]}`;
  name       : string;
  is_owned   : BooleanString;
  level      : NumberToStringValue;
  bloom      : `${(typeof blooms)[number]}`;
};

/** 空のフォーム値を返す */
const createEmptyFormValues = (): CardFormState => ({
  holomems_id: '',
  rarity     : String(star5) as `${(typeof rarities)[number]}`,
  name       : '',
  is_owned   : booleanStringFalse,  // 所有状況の初期値は「未所有」にしておく
  level      : '1',  // 未所有であったとしてもレベルは 1 から始まるので設定しておく
  bloom      : String(bloom0) as `${(typeof blooms)[number]}`
});

export default function CardsPage(): ReactElement {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cards    , setCards    ] = useState<Array<CardDisplay>>([]);
  
  const [form        , setForm        ] = useState<CardFormState>(createEmptyFormValues());
  const [editingId   , setEditingId   ] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const onLoadCards = async (): Promise<void> => {
    try {
      const response = await adminApi.get('/api/cards').json<{ result: Array<CardDisplay>; }>();
      setCards(response.result);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'カード一覧の取得に失敗しました'));
    }
  };
  
  // 画面初期表示時
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
  
  const onStartEditCard = (card: CardDisplay): void => {
    setEditingId(card.id);
    setForm({
      holomems_id: String(card.holomems_id) as NumberToStringValue,
      rarity     : String(card.rarity) as `${(typeof rarities)[number]}`,
      name       : card.name,
      is_owned   : String(card.is_owned) as BooleanString,
      level      : String(card.level) as NumberToStringValue,
      bloom      : String(card.bloom) as `${(typeof blooms)[number]}`
    });
    setErrorMessage('');
  };
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => ({ ...prevForm, [name]: value } as CardFormState));
  };
  
  const onResetForm = (): void => {
    setEditingId(null);
    setForm(createEmptyFormValues());
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const payload = { ...form };
    const parsed = cardSchema.safeParse(payload);
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
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
                {rarities.map(rarity => (
                  <option key={rarity} value={String(rarity)}>{rarity}</option>
                ))}
              </select>
            </label>
            
            <label>
              カード名
              <input name="name" type="text" value={form.name} onChange={onChangeForm} required />
            </label>
            
            {/* TODO : チェックボックスにしたい */}
            <label>
              所有状況
              <select name="is_owned" value={form.is_owned} onChange={onChangeForm}>
                <option value={booleanStringTrue}>所有</option>
                <option value={booleanStringFalse}>未所有</option>
              </select>
            </label>
            
            <label>
              レベル
              <input name="level" type="number" min={1} value={form.level} onChange={onChangeForm} required />
            </label>
            
            <label>
              開花度
              <select name="bloom" value={form.bloom} onChange={onChangeForm}>
                {blooms.map(bloom => (
                  <option key={bloom} value={String(bloom)}>{bloom}</option>
                ))}
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
              <th>グループ</th>
              <th>ホロメン</th>
              <th>レア度</th>
              <th>カード名</th>
              <th>所有</th>
              <th>レベル</th>
              <th>開花度</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(card => (
              <tr key={card.id}>
                <td>{card.holomem_group}</td>
                <td>{card.holomem_name}</td>
                <td>{card.rarity}</td>
                <td>{card.name}</td>
                <td>{card.is_owned === booleanNumberTrue ? '所有' : '未所有'}</td>
                <td>{card.level}</td>
                <td>{card.bloom}</td>
                <td><button type="button" onClick={() => onStartEditCard(card)}>編集</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

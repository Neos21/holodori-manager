import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { booleanNumberTrue, booleanStringFalse, booleanStringTrue } from '../../../shared/constants/boolean-constants';
import { bloom0, blooms, defaultCardLevel, rarities, star5 } from '../../../shared/constants/holodori-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { bloomDisplayName, cardNameDisplayName, cardSchema, isOwnedDisplayName, levelDisplayName, rarityDisplayName } from '../../../shared/schemas/card-schema';
import { groupNameDisplayName, nameDisplayName } from '../../../shared/schemas/holomem-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useHolomemsStore } from '../../stores/holomems-store';

import type { BooleanString } from '../../../shared/types/boolean-types';
import type { CardDisplay } from '../../../shared/types/card';
import type { NumberToStringValue } from '../../../shared/types/number-types';

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
  level      : String(defaultCardLevel) as NumberToStringValue,  // 未所有であったとしてもレベルは 1 から始まるので設定しておく
  bloom      : String(bloom0) as `${(typeof blooms)[number]}`
});

/**
 * カード一覧ページ
 * 
 * - `cards` の管理 (全件一覧表示・新規追加・編集)
 * - 編集時はカードが紐付くホロメン、レア度は変更不可とする (変更が必要になる場面はないため・新規登録時に誤入力してしまった場合は画面上では修正不可となる)
 * - カードの物理削除には対応していない (現状対応予定なし)
 */
export default function CardsPage(): ReactElement {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cards    , setCards    ] = useState<Array<CardDisplay>>([]);
  const [listError, setListError] = useState<string>('');
  const holomems                  = useHolomemsStore(state => state.holomems);  // 新規カード追加時に参照利用する
  
  const [isModalOpen            , setIsModalOpen            ] = useState<boolean>(false);
  const [form                   , setForm                   ] = useState<CardFormState>(createEmptyFormValues());
  const [editingId              , setEditingId              ] = useState<number | null>(null);  // `null` なら新規追加としてフォームを扱う
  const [editingHolomemGroupName, setEditingHolomemGroupName] = useState<string>('');  // 編集モーダルを開いた時に表示用として保持するホロメン情報
  const [editingHolomemName     , setEditingHolomemName     ] = useState<string>('');
  const [isSubmitting           , setIsSubmitting           ] = useState<boolean>(false);
  const [formError              , setFormError              ] = useState<string>('');
  
  const onLoadCards = async (): Promise<void> => {
    setListError('');
    try {
      const response = await adminApi.get('/api/cards').json<{ result: Array<CardDisplay>; }>();
      setCards(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'カード一覧の取得に失敗しました'));
    }
  };
  
  const onLoadHolomems = async (): Promise<void> => {
    const result = await useHolomemsStore.getState().loadHolomems();
    if(result.error != null) setListError(result.error);
  };
  
  // 画面初期表示時
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await Promise.all([onLoadCards(), onLoadHolomems()]);
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  /** フォーム情報をリセットする */
  const resetForm = (): void => {
    setEditingId(null);
    setEditingHolomemName('');
    setEditingHolomemGroupName('');
    setForm(createEmptyFormValues());
  };
  
  /** 新規追加ボタン押下時 */
  const onStartCreate = (): void => {
    resetForm();
    setFormError('');
    setIsModalOpen(true);
  };
  
  /** 編集ボタン押下時 */
  const onStartEdit = (card: CardDisplay): void => {
    setEditingId(card.id);
    setEditingHolomemGroupName(card.holomem_group_name);
    setEditingHolomemName(card.holomem_name);
    setForm({
      holomems_id: String(card.holomems_id) as NumberToStringValue,
      rarity     : String(card.rarity) as `${(typeof rarities)[number]}`,
      name       : card.name,
      is_owned   : String(card.is_owned) as BooleanString,
      level      : String(card.level) as NumberToStringValue,
      bloom      : String(card.bloom) as `${(typeof blooms)[number]}`
    });
    setFormError('');
    setIsModalOpen(true);
  };
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => ({ ...prevForm, [name]: value } as CardFormState));
  };
  
  const onChangeIsOwned = (event: ChangeEvent<HTMLInputElement>): void => {
    setForm(prevForm => ({ ...prevForm, is_owned: event.target.checked ? booleanStringTrue : booleanStringFalse }));
  };
  
  const onCloseModal = (): void => {
    resetForm();
    setFormError('');
    setIsModalOpen(false);
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const payload = { ...form };
    const parsed = cardSchema.safeParse(payload);
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      if(editingId == null) {
        await adminApi.post('/api/cards', { json: parsed.data }).json<{ result: { id: number; }; }>();
      }
      else {
        await adminApi.patch(`/api/cards/${editingId}`, { json: parsed.data });
      }
      
      setIsModalOpen(false);  // 先にモーダルを閉じる
      resetForm();  // フォームをリセットしておく
      await onLoadCards();  // 一覧を再読込する
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, editingId == null ? 'カードの追加に失敗しました' : 'カードの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main>
      <h1>カード一覧</h1>
      
      {!isEmpty(listError) && (
        <div className="alert alert-error alert-soft mb-4">{listError}</div>
      )}
      
      {isLoading ? (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      ) : (
        <>
          {cards.length === 0 ? (
            <p className="mb-4">登録されているカードはありません。</p>
          ) : (
            <div className="mb-4 overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr className="text-center">
                    <th className="w-px           pl-0 pr-1 whitespace-nowrap">{groupNameDisplayName}</th>
                    <th className="w-px           px-1      whitespace-nowrap">{nameDisplayName}</th>
                    <th className="w-px           px-1      whitespace-nowrap">★</th>
                    <th className="w-full min-w-0 px-1">{cardNameDisplayName}</th>
                    <th className="w-px           px-1      whitespace-nowrap">Lv</th>
                    <th className="w-px           px-1      whitespace-nowrap">開花</th>
                    <th className="w-px           pl-1 pr-0 whitespace-nowrap">編集</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 未所有カードの行はグレー背景で表示する */}
                  {cards.map(card => (
                    <tr key={card.id} className={`[&>td]:align-top ${card.is_owned === booleanNumberTrue ? '' : 'bg-base-300'}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                      <td className="w-px            pl-0 pr-1      whitespace-nowrap">{card.holomem_group_name}</td>
                      <td className="w-px            px-1           whitespace-nowrap">{card.holomem_name}</td>
                      <td className="w-px            px-1           whitespace-nowrap text-center">{card.rarity}</td>
                      <td className="w-full min-w-40 px-1">{card.name}</td>
                      <td className="w-px            px-1           whitespace-nowrap text-right">{card.level}</td>
                      <td className="w-px            px-1           whitespace-nowrap text-center">{card.bloom}</td>
                      <td className="w-px            pl-1 pr-0 py-0 whitespace-nowrap !align-middle">
                        <button type="button" className="btn btn-xs w-full" onClick={() => onStartEdit(card)}>編集</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="text-right">
            <button type="button" className="btn btn-info" onClick={onStartCreate}>新規カード追加</button>
          </div>
        </>
      )}
      
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h2 className="mb-4 text-lg font-bold">{editingId == null ? '新規カード追加' : `カード編集 (ID : ${editingId})`}</h2>
            
            {!isEmpty(formError) && (
              <div className="alert alert-error alert-soft mb-4">{formError}</div>
            )}
            
            <form onSubmit={onSubmit}>
              <fieldset className="fieldset">
                {/* 新規追加時はホロメンをセレクトボックスで選択・編集時は参照のみで変更不可 */}
                <label className="fieldset-label">ホロメン</label>
                {editingId == null ? (
                  <select className="select w-full" name="holomems_id" value={form.holomems_id} onChange={onChangeForm} required>
                    <option value="">(ホロメンを選択してください)</option>
                    {holomems.map(holomem => (
                      <option key={holomem.id} value={String(holomem.id)}>{holomem.group_name} : {holomem.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input w-full" type="text" readOnly disabled
                    value={`${editingHolomemGroupName} : ${editingHolomemName} (ID : ${form.holomems_id})`}
                  />
                )}
                
                {/* レア度は新規登録時のみ設定可能・編集時は参照のみで変更不可 */}
                <label className="fieldset-label">{rarityDisplayName}</label>
                <select className="select w-full" name="rarity" value={form.rarity} onChange={onChangeForm} disabled={editingId != null}>
                  {rarities.map(rarity => (
                    <option key={rarity} value={String(rarity)}>{rarity}</option>
                  ))}
                </select>
                
                <label className="fieldset-label">{cardNameDisplayName}</label>
                <input className="input w-full" name="name" type="text" value={form.name} onChange={onChangeForm} required />
                
                <label className="fieldset-label">{isOwnedDisplayName}</label>
                <input className="checkbox" type="checkbox" name="is_owned" checked={form.is_owned === booleanStringTrue} onChange={onChangeIsOwned} />
                
                <label className="fieldset-label">{levelDisplayName}</label>
                <input className="input w-full" name="level" type="number" min={1} value={form.level} onChange={onChangeForm} required />
                
                <label className="fieldset-label">{bloomDisplayName}</label>
                <select className="select w-full" name="bloom" value={form.bloom} onChange={onChangeForm}>
                  {blooms.map(bloom => (
                    <option key={bloom} value={String(bloom)}>{bloom}</option>
                  ))}
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

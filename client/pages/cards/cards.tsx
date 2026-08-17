import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { booleanNumberTrue, booleanStringFalse, booleanStringTrue } from '../../../shared/constants/boolean-constants';
import { bloom0, blooms, defaultCardLevel, rarities, star5 } from '../../../shared/constants/holodori-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { bloomDisplayName, cardNameDisplayName, cardSchema, isOwnedDisplayName, levelDisplayName, rarityDisplayName } from '../../../shared/schemas/card-schema';
import { groupNameDisplayName } from '../../../shared/schemas/holomem-schema';
import { failedToCreateMessage, failedToFetchMessage, failedToUpdateMessage } from '../../constants/client-messages';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useHolomemsStore } from '../../stores/holomems-store';

import type { CardDisplay } from '../../../shared/types/app/card-display';
import type { Card } from '../../../shared/types/entities/card';
import type { Holomem } from '../../../shared/types/entities/holomem';
import type { BooleanString } from '../../../shared/types/utilities/boolean-types';
import type { NumberToStringValue } from '../../../shared/types/utilities/number-types';

/** カードの新規追加・編集フォームの入力値・数値項目もフォーム要素に合わせて文字列として扱う */
type CardFormState = {
  holomems_id: NumberToStringValue;
  rarity     : `${(typeof rarities)[number]}`;
  name       : string;
  is_owned   : BooleanString;
  level      : NumberToStringValue;
  bloom      : `${(typeof blooms)[number]}`;
};

/** 新規追加用の初期フォーム値を返す */
const createEmptyFormValues = (): CardFormState => ({
  holomems_id: '',
  rarity     : String(star5) as `${(typeof rarities)[number]}`,
  name       : '',
  is_owned   : booleanStringFalse,  // 所有状況の初期値は「未所有」にしておく
  level      : String(defaultCardLevel) as NumberToStringValue,  // 未所有の場合も既定のカードレベルを設定する
  bloom      : String(bloom0) as `${(typeof blooms)[number]}`
});

/** カードとホロメンを表示用に合成し、ホロメン表示順・ホロメン ID は昇順、レア度は降順、カード ID は昇順で並べる */
const createCardDisplays = (cards: Array<Card>, holomems: Array<Holomem>): Array<CardDisplay> => [...holomems]
  .sort((holomemA, holomemB) => holomemA.sort_order - holomemB.sort_order || holomemA.id - holomemB.id)
  .flatMap(holomem => cards
    .filter(card => card.holomems_id === holomem.id)
    .sort((cardA, cardB) => cardB.rarity - cardA.rarity || cardA.id - cardB.id)
    .map(card => ({
      ...card,
      holomem_group_name: holomem.group_name,
      holomem_name      : holomem.name
    })));

/**
 * カード一覧ページ
 * 
 * - `cards` の管理 (全件一覧表示・新規追加・編集)
 * - 編集時はカードが紐付くホロメン、レア度は変更不可とする (変更が必要になる場面はないため・新規登録時に誤入力してしまった場合は画面上では修正不可となる)
 * - カードの物理削除には対応していない (現状対応予定なし)
 */
export default function CardsPage(): ReactElement {
  const [isLoading, setIsLoading] = useState<boolean>(true);                    // 一覧の初期読込中か否か
  const [cards    , setCards    ] = useState<Array<Card>>([]);                  // API から取得したカード一覧
  const [listError, setListError] = useState<string>('');                       // 一覧読込時のエラーメッセージ
  const holomems                  = useHolomemsStore(state => state.holomems);  // カードの表示情報との合成・新規カード追加時の選択肢に利用する
  const cardDisplays              = createCardDisplays(cards, holomems);        // API から個別に取得したカードとホロメンから導出する表示用一覧
  
  const [isModalOpen , setIsModalOpen ] = useState<boolean>(false);                          // 新規追加・編集モーダルを表示中か否か
  const [form        , setForm        ] = useState<CardFormState>(createEmptyFormValues());  // 新規追加・編集フォームの入力値
  const [editingId   , setEditingId   ] = useState<number | null>(null);                     // `null` なら新規追加としてフォームを扱う
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);                          // フォーム送信中か否か
  const [formError   , setFormError   ] = useState<string>('');                              // フォームのエラーメッセージ
  
  /** 編集中のフォームが参照するホロメン・新規追加時または対象を取得できない場合は `null` */
  const editingHolomem             = editingId      == null ? null : holomems.find(holomem => holomem.id === Number(form.holomems_id)) ?? null;
  /** 編集時に読取専用で表示するホロメン情報・対象を取得できない場合は空文字 */
  const editingHolomemDisplayValue = editingHolomem == null ? ''   : `${editingHolomem.group_name} : ${editingHolomem.name}`;
  
  /** カード一覧を API から取得し、取得エラーを画面表示用 State に反映する */
  const onLoadCards = async (): Promise<void> => {
    setListError('');
    try {
      const response = await adminApi.get('/api/cards').json<{ result: Array<Card>; }>();
      setCards(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, failedToFetchMessage('カード一覧')));
    }
  };
  
  /** 未取得の場合にホロメン一覧を Store に読み込み、取得エラーを画面表示用 State に反映する */
  const onLoadHolomems = async (): Promise<void> => {
    const result = await useHolomemsStore.getState().loadHolomems();
    if(result.error != null) setListError(result.error);
  };
  
  // 画面初期表示時にカード一覧とホロメン一覧を並行して読み込む
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
  
  /** 変更されたフォーム要素の値をフォーム State に反映する */
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => ({ ...prevForm, [name]: value } as CardFormState));
  };
  
  /** 所有状況チェックボックスの値をフォーム State に反映する */
  const onChangeIsOwned = (event: ChangeEvent<HTMLInputElement>): void => {
    setForm(prevForm => ({ ...prevForm, is_owned: event.target.checked ? booleanStringTrue : booleanStringFalse }));
  };
  
  /** フォーム情報をリセットしてモーダルを閉じる */
  const onCloseModal = (): void => {
    resetForm();
    setFormError('');
    setIsModalOpen(false);
  };
  
  /** フォームを検証してカードを新規追加または更新し、一覧を再読込する */
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
      setFormError(extractApiErrorMessage(error, editingId == null ? failedToCreateMessage('カード') : failedToUpdateMessage('カード')));
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
          {cardDisplays.length === 0 ? (
            <p className="mb-4">登録されているカードはありません。</p>
          ) : (
            <div className="mb-4 overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                    <th className="w-px pl-0 pr-1            ">{groupNameDisplayName}</th>
                    <th className="w-px px-1                 ">名前</th>
                    <th className="w-px px-1      text-center">★</th>
                    <th className="     px-1                 ">{cardNameDisplayName}</th>
                    <th className="w-px px-1      text-center">Lv</th>
                    <th className="w-px px-1      text-center">開花</th>
                    <th className="w-px pl-1 pr-0 text-center">編集</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 未所有カードの行はグレー背景で表示する */}
                  {cardDisplays.map(card => (
                    <tr key={card.id} className={`[&>td]:align-top ${card.is_owned === booleanNumberTrue ? '' : 'bg-base-300'}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                      <td className="         pl-0 pr-1      whitespace-nowrap              ">{card.holomem_group_name}</td>
                      <td className="         px-1           whitespace-nowrap              ">{card.holomem_name}</td>
                      <td className="         px-1           whitespace-nowrap text-center  ">{card.rarity}</td>
                      <td className="min-w-36 px-1                                          ">{card.name}</td>
                      <td className="         px-1           whitespace-nowrap text-right   ">{card.level}</td>
                      <td className="         px-1           whitespace-nowrap text-center  ">{card.bloom}</td>
                      <td className="         pl-1 pr-0 py-0 whitespace-nowrap !align-middle"><button type="button" className="btn btn-xs w-full" onClick={() => onStartEdit(card)}>編集</button></td>
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
                  <p>{editingHolomemDisplayValue}</p>
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

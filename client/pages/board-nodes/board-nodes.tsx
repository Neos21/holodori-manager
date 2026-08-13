import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { boardNodeYellowTargets } from '../../../shared/constants/app-constants';
import { booleanNumberTrue, booleanStringFalse, booleanStringTrue } from '../../../shared/constants/boolean-constants';
import { boardNodeCategories, boardNodeCategoryYellow } from '../../../shared/constants/holodori-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { amountDisplayName, boardNodeSchema, categoryDisplayName, connectRateDisplayName, descriptionDisplayName, holomemsIdDisplayName, isUnlockedDisplayName, yellowTargetDisplayName } from '../../../shared/schemas/board-node-schema';
import { holomemSchema, noteDisplayName } from '../../../shared/schemas/holomem-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { BoardNodeYellowTarget } from '../../../shared/types/app-types';
import type { BoardNode } from '../../../shared/types/board-node';
import type { BooleanString } from '../../../shared/types/boolean-types';
import type { BoardNodeCategory } from '../../../shared/types/holodori-types';
import type { Holomem } from '../../../shared/types/holomem';
import type { NumberToStringValue } from '../../../shared/types/number-types';

/** ホロメンボードマスの新規追加・編集フォームの型定義 */
type BoardNodeFormState = {
  holomems_id  : NumberToStringValue;
  category     : BoardNodeCategory;
  yellow_target: BoardNodeYellowTarget | '';
  description  : string;
  is_unlocked  : BooleanString;
  amount       : NumberToStringValue;
  connect_rate : NumberToStringValue;
};

/** ホロメンメモ編集フォームの型定義 */
type HolomemNoteFormState = {
  note: string;
};

const categoryDisplayNames: Record<BoardNodeCategory, string> = {
  yellow: '黄マス',
  green : '緑マス',
  red   : '赤マス',
  blue  : '青マス'
};

const categoryBadgeClasses: Record<BoardNodeCategory, string> = {
  yellow: 'badge-warning',
  green : 'badge-success',
  red   : 'badge-error',
  blue  : 'badge-info'
};

const yellowTargetDisplayNames: Record<BoardNodeYellowTarget, string> = {
  cube     : 'キューブ',
  training : '特訓アイテム',
  lesson_pt: 'レッスン Pt'
};

/** 空のボードノードフォーム値を返す */
const createEmptyFormValues = (): BoardNodeFormState => ({
  holomems_id  : '',
  category     : boardNodeCategoryYellow,  // 仮で「黄マス」にしておく
  yellow_target: '',
  description  : '',
  is_unlocked  : booleanStringFalse,  // デフォルトは未解放にしておく
  amount       : '',
  connect_rate : ''
});

/** 最終レートを計算する */
const calcFinalRate = (amount: number, connectRate: number | null): number => amount * (1 + (connectRate ?? 0) / 100);

/** ボードノード一覧ページ */
export default function BoardNodesPage(): ReactElement {
  const [isLoading , setIsLoading ] = useState<boolean>(true);
  const [boardNodes, setBoardNodes] = useState<Array<BoardNode>>([]);
  const [holomems  , setHolomems  ] = useState<Array<Holomem>>([]);
  const [listError , setListError ] = useState<string>('');
  
  // ボードノードモーダル用 State
  const [isModalOpen   , setIsModalOpen   ] = useState<boolean>(false);
  const [form          , setForm          ] = useState<BoardNodeFormState>(createEmptyFormValues());
  const [editingId     , setEditingId     ] = useState<number | null>(null);  // `null` なら新規追加としてフォームを扱う
  const [editingHolomem, setEditingHolomem] = useState<Holomem | null>(null);  // 編集モーダルを開いた時に表示用として保持するホロメン情報
  const [isSubmitting  , setIsSubmitting  ] = useState<boolean>(false);
  const [formError     , setFormError     ] = useState<string>('');
  
  // ホロメンメモモーダル用 State
  const [isNoteModalOpen  , setIsNoteModalOpen  ] = useState<boolean>(false);
  const [holomemNoteForm  , setHolomemNoteForm  ] = useState<HolomemNoteFormState>({ note: '' });
  const [noteTargetHolomem, setNoteTargetHolomem] = useState<Holomem | null>(null);
  const [isSubmittingNote , setIsSubmittingNote ] = useState<boolean>(false);
  const [noteFormError    , setNoteFormError    ] = useState<string>('');
  
  const onLoadData = async (): Promise<void> => {
    try {
      const [boardNodesResponse, holomemsResponse] = await Promise.all([
        adminApi.get('/api/board-nodes').json<{ result: Array<BoardNode>; }>(),
        adminApi.get('/api/holomems').json<{ result: Array<Holomem>; }>()
      ]);
      setBoardNodes(boardNodesResponse.result);
      setHolomems(holomemsResponse.result);
      setListError('');
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'データの取得に失敗しました'));
    }
  };
  
  // 画面初期表示時
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await onLoadData();
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  /** フォーム情報をリセットする */
  const resetForm = (): void => {
    setEditingId(null);
    setEditingHolomem(null);
    setForm(createEmptyFormValues());
  };
  
  /** 新規追加ボタン押下時 */
  const onStartCreate = (): void => {
    resetForm();
    setFormError('');
    setIsModalOpen(true);
  };
  
  /** 編集ボタン押下時 */
  const onStartEdit = (boardNode: BoardNode): void => {
    setEditingId(boardNode.id);
    const targetHolomem = holomems.find(holomem => holomem.id === boardNode.holomems_id) ?? null;  // TODO : 万が一 null の時はエラーハンドリング
    setEditingHolomem(targetHolomem);
    setForm({
      holomems_id  : String(boardNode.holomems_id) as NumberToStringValue,
      category     : boardNode.category,
      yellow_target: boardNode.category === boardNodeCategoryYellow ? (boardNode.yellow_target ?? '') : '',
      description  : boardNode.description,
      is_unlocked  : String(boardNode.is_unlocked) as BooleanString,
      amount       : String(boardNode.amount) as NumberToStringValue,
      connect_rate : isEmpty(boardNode.connect_rate) ? '' : String(boardNode.connect_rate) as NumberToStringValue
    });
    setFormError('');
    setIsModalOpen(true);
  };
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => {
      const newForm = { ...prevForm, [name]: value } as BoardNodeFormState;
      // カテゴリ変更時に `yellow_target` 欄の整合性を保つ
      if(name === 'category' && newForm.category !== boardNodeCategoryYellow) newForm.yellow_target = '';
      return newForm;
    });
  };
  
  const onChangeIsUnlocked = (event: ChangeEvent<HTMLInputElement>): void => {
    setForm(prevForm => ({ ...prevForm, is_unlocked: event.target.checked ? booleanStringTrue : booleanStringFalse }));
  };
  
  const onCloseModal = (): void => {
    resetForm();
    setFormError('');
    setIsModalOpen(false);
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const formDataToValidate = { ...form };
    // 黄マス以外の場合に `yellow_target` へ不正値が入らないように最終調整する
    if(formDataToValidate.category !== boardNodeCategoryYellow) formDataToValidate.yellow_target = '';
    const parsed = boardNodeSchema.safeParse(formDataToValidate);
    if(!parsed.success) return setFormError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      if(editingId == null) {
        await adminApi.post('/api/board-nodes', { json: parsed.data });
      }
      else {
        await adminApi.patch(`/api/board-nodes/${editingId}`, { json: parsed.data });
      }
      
      setIsModalOpen(false);  // 先にモーダルを閉じる
      resetForm();  // フォームをリセットしておく
      await onLoadData();  // 一覧を再読込する TODO : board-nodes だけで良い気がする
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, editingId == null ? 'マスの追加に失敗しました' : 'マスの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onDelete = async (): Promise<void> => {
    if(editingId == null) return;  // TODO : 万が一 null の時はエラーハンドリング
    if(!window.confirm('このマスを削除しますか？')) return;
    
    setFormError('');
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/board-nodes/${editingId}`);
      
      setIsModalOpen(false);  // 先にモーダルを閉じる
      resetForm();  // フォームをリセットしておく
      await onLoadData();  // 一覧を再読込する TODO : board-nodes だけで良い気がする
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, 'マスの削除に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** ホロメンメモの編集を開始する */
  const onOpenNoteModal = (holomem: Holomem): void => {
    setNoteTargetHolomem(holomem);
    setHolomemNoteForm({ note: holomem.note ?? '' });
    setNoteFormError('');
    setIsNoteModalOpen(true);
  };
  
  const onChangeNoteForm = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setHolomemNoteForm(prevHolomemNoteForm => ({ ...prevHolomemNoteForm, [name]: value }));
  };
  
  const onCloseNoteModal = (): void => {
    setIsNoteModalOpen(false);  // 先にモーダルを閉じてから関連 State をリセットしておく
    setNoteTargetHolomem(null);
    setHolomemNoteForm({ note: '' });
    setNoteFormError('');
  };
  
  const onSubmitNote = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    
    if(noteTargetHolomem == null) return;  // TODO : 万が一 null の時はエラーハンドリング
    setNoteFormError('');
    
    const parsed = holomemSchema.pick({ note: true }).safeParse({ note: holomemNoteForm.note });
    if(!parsed.success) return setNoteFormError(mergeIssues(parsed.error));
    
    setIsSubmittingNote(true);
    try {
      await adminApi.patch(`/api/holomems/${noteTargetHolomem.id}`, { json: parsed.data });
      onCloseNoteModal();  // 先にモーダルを閉じる
      await onLoadData();  // TODO : `holomems` State だけ API コールして更新すれば、`board-nodes` の方は再読込要らないんじゃない？
    }
    catch(error) {
      setNoteFormError(extractApiErrorMessage(error, 'ホロメンメモの更新に失敗しました'));
    }
    finally {
      setIsSubmittingNote(false);
    }
  };
  
  // TODO : JSX 部分未レビュー
  return (
    <main>
      <h1>ホロメンボード一覧</h1>
      
      <button type="button" className="btn btn-primary" onClick={onStartCreate}>＋ マスを新規追加</button>
      
      {!isEmpty(listError) && (
        <div className="alert alert-error mb-4">{listError}</div>
      )}
      
      {isLoading ? (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      ) : (
        boardNodeCategories.map(category => {
          const categoryNodes = boardNodes.filter(n => n.category === category);
          if(categoryNodes.length === 0) return null;
          
          return (
            <section key={category} className="mb-12 border-b border-base-300 pb-8 last:border-0 last:pb-0">
              <h2 className="mb-6">
                <span className={`badge ${categoryBadgeClasses[category]} badge-lg text-lg font-bold py-4 px-6`}>
                  {categoryDisplayNames[category]}
                </span>
              </h2>
              
              <div className="flex flex-col gap-10">
                {holomems.map(holomem => {
                  const nodes = categoryNodes.filter(n => n.holomems_id === holomem.id);
                  if(nodes.length === 0) return null;
                  
                  return (
                    <div key={holomem.id}>
                      <h3 className="mb-4 text-xl font-bold border-l-4 border-primary pl-3">
                        {holomem.group_name} - {holomem.name} <span className="text-sm text-base-content/60 font-normal ml-2">(ID: {holomem.id})</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                        <div className="xl:col-span-8 overflow-x-auto">
                          <table className="table table-sm table-pin-rows table-pin-cols w-full">
                            <thead>
                              <tr>
                                {category === boardNodeCategoryYellow && <th className="w-px whitespace-nowrap">{yellowTargetDisplayName}</th>}
                                <th className="w-full">{descriptionDisplayName}</th>
                                <th className="w-px whitespace-nowrap">解放</th>
                                <th className="w-px whitespace-nowrap text-right">{amountDisplayName}</th>
                                <th className="w-px whitespace-nowrap text-right">{connectRateDisplayName}</th>
                                <th className="w-px whitespace-nowrap text-right">最終レート</th>
                                <th className="w-px whitespace-nowrap">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {nodes.map(node => (
                                <tr key={node.id} className="hover">
                                  {category === boardNodeCategoryYellow && (
                                    <td className="w-px whitespace-nowrap">
                                      {isEmpty(node.yellow_target) ? '—' : yellowTargetDisplayNames[node.yellow_target!]}
                                    </td>
                                  )}
                                  <td className="w-full min-w-48 whitespace-pre-wrap">{node.description}</td>
                                  <td className="w-px whitespace-nowrap">
                                    <div className={`badge badge-sm ${node.is_unlocked === booleanNumberTrue ? 'badge-success' : 'badge-ghost'}`}>
                                      {node.is_unlocked === booleanNumberTrue ? '◯' : '×'}
                                    </div>
                                  </td>
                                  <td className="w-px whitespace-nowrap text-right">{node.amount}</td>
                                  <td className="w-px whitespace-nowrap text-right">{node.connect_rate ?? '—'}</td>
                                  <td className="w-px whitespace-nowrap text-right font-bold text-primary">
                                    {Number(calcFinalRate(node.amount, node.connect_rate).toFixed(2))}
                                  </td>
                                  <td className="w-px whitespace-nowrap">
                                    <button type="button" className="btn btn-xs btn-outline" onClick={() => onStartEdit(node)}>編集</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="xl:col-span-4">
                          <div 
                            className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer shadow-sm border border-base-300 h-full"
                            onClick={() => onOpenNoteModal(holomem)}
                          >
                            <div className="card-body p-4">
                              <h4 className="card-title text-sm opacity-70 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                {noteDisplayName}
                              </h4>
                              <p className="whitespace-pre-wrap text-sm">
                                {isEmpty(holomem.note) ? (
                                  <span className="opacity-50 italic">メモはありません。クリックして編集</span>
                                ) : (
                                  holomem.note
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
      
      {/* ボードノード追加・編集モーダル */}
      <dialog className={`modal ${isModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg mb-6">{editingId == null ? 'マスの新規追加' : 'マスの編集'}</h3>
          
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full md:col-span-2">
                <label className="label"><span className="label-text font-bold">{holomemsIdDisplayName}</span></label>
                {editingId == null ? (
                  <select name="holomems_id" className="select select-bordered w-full" value={form.holomems_id} onChange={onChangeForm} required>
                    <option value="" disabled>ホロメンを選択してください</option>
                    {holomems.map(holomem => (
                      <option key={holomem.id} value={holomem.id}>{holomem.group_name} - {holomem.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" className="input input-bordered w-full" value={editingHolomem ? `${editingHolomem.group_name} - ${editingHolomem.name}` : ''} disabled />
                )}
              </div>
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold">{categoryDisplayName}</span></label>
                <select name="category" className="select select-bordered w-full" value={form.category} onChange={onChangeForm}>
                  {boardNodeCategories.map(category => (
                    <option key={category} value={category}>{categoryDisplayNames[category]}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold">{yellowTargetDisplayName}</span></label>
                <select 
                  name="yellow_target" 
                  className="select select-bordered w-full" 
                  value={form.yellow_target} 
                  onChange={onChangeForm} 
                  disabled={form.category !== boardNodeCategoryYellow}
                >
                  <option value="">選択してください</option>
                  {boardNodeYellowTargets.map(yellowTarget => (
                    <option key={yellowTarget} value={yellowTarget}>{yellowTargetDisplayNames[yellowTarget]}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-control w-full md:col-span-2">
                <label className="label"><span className="label-text font-bold">{descriptionDisplayName}</span></label>
                <textarea name="description" className="textarea textarea-bordered h-24 w-full" value={form.description} onChange={onChangeForm} required />
              </div>
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold">{amountDisplayName}</span></label>
                <input name="amount" type="number" step="any" className="input input-bordered w-full" value={form.amount} onChange={onChangeForm} required />
              </div>
              
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-bold">{connectRateDisplayName}</span></label>
                <input name="connect_rate" type="number" step="any" className="input input-bordered w-full" value={form.connect_rate} onChange={onChangeForm} />
              </div>
              
              <div className="form-control w-full md:col-span-2">
                <label className="label cursor-pointer justify-start gap-4">
                  <span className="label-text font-bold">{isUnlockedDisplayName}</span>
                  <input type="checkbox" className="toggle toggle-primary" name="is_unlocked" checked={form.is_unlocked === booleanStringTrue} onChange={onChangeIsUnlocked} />
                </label>
              </div>
            </div>
            
            {!isEmpty(formError) && (
              <div className="alert alert-error mt-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{formError}</span>
              </div>
            )}
            
            <div className={`modal-action ${editingId != null ? 'justify-between' : ''}`}>
              {editingId != null && (
                <button type="button" className="btn btn-error" onClick={onDelete} disabled={isSubmitting}>削除する</button>
              )}
              <div className="flex gap-2">
                <button type="button" className="btn" onClick={onCloseModal} disabled={isSubmitting}>キャンセル</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting && <span className="loading loading-spinner"></span>}
                  {editingId == null ? '追加する' : '更新する'}
                </button>
              </div>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={onCloseModal} disabled={isSubmitting}>閉じる</button>
        </form>
      </dialog>
      
      {/* ホロメンメモ編集モーダル */}
      <dialog className={`modal ${isNoteModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-6">ホロメンメモ編集</h3>
          
          <form onSubmit={onSubmitNote}>
            <div className="form-control w-full mb-4">
              <label className="label"><span className="label-text font-bold">ホロメン</span></label>
              <input type="text" className="input input-bordered w-full" value={noteTargetHolomem ? `${noteTargetHolomem.group_name} - ${noteTargetHolomem.name}` : ''} disabled />
            </div>
            
            <div className="form-control w-full mb-6">
              <label className="label"><span className="label-text font-bold">{noteDisplayName}</span></label>
              <textarea 
                name="note" 
                className="textarea textarea-bordered h-32 w-full" 
                value={holomemNoteForm.note} 
                onChange={onChangeNoteForm} 
                placeholder="ホロメンに関するメモ (空欄可)"
              />
            </div>
            
            {!isEmpty(noteFormError) && (
              <div className="alert alert-error mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{noteFormError}</span>
              </div>
            )}
            
            <div className="modal-action">
              <button type="button" className="btn" onClick={onCloseNoteModal} disabled={isSubmittingNote}>キャンセル</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingNote}>
                {isSubmittingNote && <span className="loading loading-spinner"></span>}
                メモを更新する
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={onCloseNoteModal} disabled={isSubmittingNote}>閉じる</button>
        </form>
      </dialog>
    </main>
  );
}

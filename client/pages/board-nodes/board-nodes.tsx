import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { boardNodeYellowTargets } from '../../../shared/constants/app-constants';
import { booleanNumberTrue, booleanStringFalse, booleanStringTrue } from '../../../shared/constants/boolean-constants';
import { boardNodeCategories, boardNodeCategoryYellow } from '../../../shared/constants/holodori-constants';
import { formatDecimal } from '../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { amountDisplayName, boardNodeSchema, categoryDisplayName, connectRateDisplayName, descriptionDisplayName, isUnlockedDisplayName, yellowTargetDisplayName } from '../../../shared/schemas/board-node-schema';
import { BoardNodesService } from '../../../shared/services/board-nodes-service';
import { HolomemNoteModal } from '../../components/holomem-note-modal/holomem-note-modal';
import { failedToCreateMessage, failedToDeleteMessage, failedToFetchMessage, failedToUpdateMessage } from '../../constants/client-messages';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useHolomemsStore } from '../../stores/holomems-store';

import type { BoardNode } from '../../../shared/types/entities/board-node';
import type { Holomem } from '../../../shared/types/entities/holomem';
import type { BoardNodeCategory, BoardNodeYellowTarget } from '../../../shared/types/holodori/board-node-types';
import type { BooleanString } from '../../../shared/types/utilities/boolean-types';
import type { NumberToStringValue } from '../../../shared/types/utilities/number-types';

/** ホロメンボードマスの新規追加・編集フォームの入力値・数値項目もフォーム要素に合わせて文字列として扱う */
type BoardNodeFormState = {
  holomems_id  : NumberToStringValue;
  category     : BoardNodeCategory;
  /** 未選択時と黄マス以外では空文字とし、Schema で `null` に正規化する */
  yellow_target: BoardNodeYellowTarget | '';
  description  : string;
  is_unlocked  : BooleanString;
  amount       : NumberToStringValue;
  /** 未入力時は空文字とし、Schema で `null` に正規化する */
  connect_rate : NumberToStringValue;
};

/** カテゴリ名に対応する画面表記 */
const categoryDisplayNames: Record<BoardNodeCategory, string> = {
  yellow: '黄マス',
  green : '緑マス',
  red   : '赤マス',
  blue  : '青マス'
};

/** カテゴリ見出しの文字色を表現する CSS クラス名・Tailwind ビルド時に全クラスを検出できるようカテゴリ別のクラス名は動的に組み立てず列挙する */
const categoryColourClassText: Record<BoardNodeCategory, string> = {
  yellow: 'text-warning',
  green : 'text-success',
  red   : 'text-error',
  blue  : 'text-info'
};

/** ホロメン見出しの枠線色を表現する CSS クラス名 */
const categoryColourClassBorder: Record<BoardNodeCategory, string> = {
  yellow: 'border-warning',
  green : 'border-success',
  red   : 'border-error',
  blue  : 'border-info'
};

/** カテゴリ選択欄の色を表現する CSS クラス名 */
const categoryColourClassSelect: Record<BoardNodeCategory, string> = {
  yellow: 'select-warning',
  green : 'select-success',
  red   : 'select-error',
  blue  : 'select-info'
};

/** 報酬アップ対象アイテムの画面表記 */
const yellowTargetDisplayNames: Record<BoardNodeYellowTarget, string> = {
  cube     : 'キューブ',
  training : '特訓アイテム',
  lesson_pt: 'レッスン Pt'
};

/** 新規追加用の初期フォーム値を返す */
const createEmptyFormValues = (): BoardNodeFormState => ({
  holomems_id  : '',
  category     : boardNodeCategoryYellow,
  yellow_target: '',
  description  : '',
  is_unlocked  : booleanStringFalse,
  amount       : '',
  connect_rate : ''
});

/** ボードノード一覧ページ */
export default function BoardNodesPage(): ReactElement {
  const [isLoading , setIsLoading ] = useState<boolean>(true);                    // 一覧の初期読込中か否か
  const [boardNodes, setBoardNodes] = useState<Array<BoardNode>>([]);             // API から取得したボードマス一覧
  const [listError , setListError ] = useState<string>('');                       // 一覧読込時のエラーメッセージ
  const holomems                    = useHolomemsStore(state => state.holomems);  // 複数ページで使用されるためインメモリ Store でキャッシュする
  
  // ボードノードモーダル用 State
  const [isModalOpen , setIsModalOpen ] = useState<boolean>(false);                               // 新規追加・編集モーダルを表示中か否か
  const [form        , setForm        ] = useState<BoardNodeFormState>(createEmptyFormValues());  // 新規追加・編集フォームの入力値
  const [editingId   , setEditingId   ] = useState<number | null>(null);                          // `null` なら新規追加としてフォームを扱う
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);                               // フォーム送信中か否か
  const [formError   , setFormError   ] = useState<string>('');                                   // フォームのエラーメッセージ
  
  // ホロメンメモの編集対象・`null` はモーダルを閉じている状態
  const [noteTargetHolomem, setNoteTargetHolomem] = useState<Holomem | null>(null);
  
  /** 編集中のフォームが参照するホロメン。新規追加時または対象を取得できない場合は `null` */
  const editingHolomem             = editingId      == null ? null : holomems.find(holomem => holomem.id === Number(form.holomems_id)) ?? null;
  /** 編集時に読み取り専用で表示するホロメン情報。対象を取得できない場合は空文字 */
  const editingHolomemDisplayValue = editingHolomem == null ? ''   : `${editingHolomem.group_name} : ${editingHolomem.name}`;
  
  /** ボードマス一覧を API から取得し、取得エラーを画面表示用 State に反映する */
  const onLoadBoardNodes = async (): Promise<void> => {
    setListError('');
    try {
      const boardNodesResponse = await adminApi.get('/api/board-nodes').json<{ result: Array<BoardNode>; }>();
      setBoardNodes(boardNodesResponse.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, failedToFetchMessage('ボードノード一覧')));
    }
  };
  
  /** 未取得の場合にホロメン一覧を Store に読み込み、取得エラーを画面表示用 State に反映する */
  const onLoadHolomems = async (): Promise<void> => {
    const result = await useHolomemsStore.getState().loadHolomems();
    if(result.error != null) setListError(result.error);
  };
  
  // 画面初期表示時にボードマス一覧とホロメン一覧を並行して読み込む
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await Promise.all([onLoadBoardNodes(), onLoadHolomems()]);
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
  const onStartEdit = (boardNode: BoardNode): void => {
    setEditingId(boardNode.id);
    setForm({
      holomems_id  : String(boardNode.holomems_id) as NumberToStringValue,
      category     : boardNode.category,
      yellow_target: boardNode.category === boardNodeCategoryYellow ? (boardNode.yellow_target ?? '') : '',
      description  : boardNode.description,
      is_unlocked  : String(boardNode.is_unlocked) as BooleanString,
      amount       : formatDecimal(boardNode.amount) as NumberToStringValue,
      connect_rate : isEmpty(boardNode.connect_rate) ? '' : String(boardNode.connect_rate) as NumberToStringValue
    });
    setFormError('');
    setIsModalOpen(true);
  };
  
  /** 変更されたフォーム要素の値を反映し、カテゴリ変更時は黄マス専用項目との整合性を保つ */
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => {
      const newForm = { ...prevForm, [name]: value } as BoardNodeFormState;
      if(name === 'category' && newForm.category !== boardNodeCategoryYellow) newForm.yellow_target = '';
      return newForm;
    });
  };
  
  /** 解放状況チェックボックスの値をフォーム State に反映する */
  const onChangeIsUnlocked = (event: ChangeEvent<HTMLInputElement>): void => {
    setForm(prevForm => ({ ...prevForm, is_unlocked: event.target.checked ? booleanStringTrue : booleanStringFalse }));
  };
  
  /** フォーム情報をリセットしてボードマス編集モーダルを閉じる */
  const onCloseModal = (): void => {
    resetForm();
    setFormError('');
    setIsModalOpen(false);
  };
  
  /** フォームを検証してボードマスを新規追加または更新し、一覧を再読込する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError('');
    
    const payload = { ...form };
    if(payload.category !== boardNodeCategoryYellow) payload.yellow_target = '';  // 黄マス以外の場合に `yellow_target` に不正値が入らないように最終調整する
    const parsed = boardNodeSchema.safeParse(payload);
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
      await onLoadBoardNodes();  // 一覧を再読込する
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, editingId == null ? failedToCreateMessage('マス') : failedToUpdateMessage('マス')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** `window.confirm()` で確認後、編集中のボードマスを削除して一覧を再読込する */
  const onDelete = async (): Promise<void> => {
    if(editingId == null) return window.alert('異常 : 削除対象のマスが選択されていません');
    if(!window.confirm('このマスを削除しますか？')) return;
    
    setFormError('');
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/board-nodes/${editingId}`);
      
      setIsModalOpen(false);  // 先にモーダルを閉じる
      resetForm();  // フォームをリセットしておく
      await onLoadBoardNodes();  // 一覧を再読込する
    }
    catch(error) {
      setFormError(extractApiErrorMessage(error, failedToDeleteMessage('マス')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** ホロメンメモの編集を開始する */
  const onOpenNoteModal = (holomem: Holomem): void => {
    setNoteTargetHolomem(holomem);
  };
  
  /** 編集対象をリセットしてホロメンメモ編集モーダルを閉じる */
  const onCloseNoteModal = (): void => {
    setNoteTargetHolomem(null);
  };
  
  /** 更新後に共有するホロメン一覧を再読込する */
  const onUpdateHolomemNote = async (): Promise<void> => {
    const reloadResult = await useHolomemsStore.getState().reloadHolomems();
    if(reloadResult.error != null) setListError(reloadResult.error);
  };
  
  return (
    <main>
      <h1>ホロメンボード一覧</h1>
      
      {!isEmpty(listError) && (
        <div className="alert alert-error alert-soft mb-4">{listError}</div>
      )}
      
      {isLoading ? (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      ) : (
        <>
          {boardNodes.length === 0 ? (
            <p className="mb-4">登録されているマスはありません。</p>
          ) : (
            boardNodeCategories.map(category => {
              // 1カテゴリごとに表示する
              const categoryNodes = boardNodes.filter(boardNode => boardNode.category === category);
              if(categoryNodes.length === 0) return null;
              
              return (
                <section key={category} className="mb-8">
                  <h2 className={`mb-4 text-lg font-bold ${categoryColourClassText[category]}`}>{categoryDisplayNames[category]}</h2>
                  
                  {/* 1カテゴリ内のホロメンごとに分割して表示する */}
                  {holomems.map(holomem => {
                    const nodes = categoryNodes.filter(boardNode => boardNode.holomems_id === holomem.id);
                    if(nodes.length === 0) return null;
                    
                    return (
                      <section key={holomem.id} className="mb-6">
                        <h3 className={`border-l-8 pl-2 font-bold ${categoryColourClassBorder[category]}`}>
                          {holomem.group_name} : {holomem.name} <span className="text-xs font-normal">(ID : {holomem.id})</span>
                        </h3>
                        
                        <div className="overflow-x-auto">
                          {/* 全体の最小幅を `min-w` で決め、「ホロメンメモ」列を `15rem` に固定して残りを「マス効果」列に割り当てるよう `minmax` 指定をしている */}
                          <div className="grid min-w-175 grid-cols-[minmax(0,1fr)_15rem]">
                            <div>
                              <table className="table table-xs">
                                <colgroup>
                                  {category === boardNodeCategoryYellow && (<col className="w-px" />)}
                                  <col />
                                  <col className="w-px" />
                                  <col className="w-px" />
                                  <col className="w-px" />
                                  <col className="w-px" />
                                </colgroup>
                                <thead>
                                  <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                                    {category === boardNodeCategoryYellow && (<th className="pl-0 pr-1">報酬 UP</th>)}
                                    <th className={category === boardNodeCategoryYellow ? 'px-1' : 'pl-0 pr-1'}>マス効果</th>
                                    <th className="px-1 text-right ">効果</th>
                                    <th className="px-1 text-right ">コネクト</th>
                                    <th className="px-1 text-right ">合計</th>
                                    <th className="px-1 text-center">編集</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {nodes.map(node => (
                                    <tr key={node.id} className={`[&>td]:align-top ${node.is_unlocked === booleanNumberTrue ? '' : 'bg-base-300'}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                                      {category === boardNodeCategoryYellow && (<td className="pl-0 pr-1 whitespace-nowrap">{isEmpty(node.yellow_target) ? '-' : yellowTargetDisplayNames[node.yellow_target!]}</td>)}
                                      <td className={`${category === boardNodeCategoryYellow ? 'px-1' : 'pl-0 pr-1'} whitespace-pre-wrap`}>{node.description}</td>
                                      <td className="px-1      whitespace-nowrap text-right               ">{formatDecimal(node.amount)}</td>
                                      <td className="px-1      whitespace-nowrap text-right               ">{node.connect_rate == null ? '-' : `${node.connect_rate}%`}</td>
                                      <td className="px-1      whitespace-nowrap text-right  font-bold    ">{formatDecimal(BoardNodesService.calcFinalRate(node.amount, node.connect_rate))}%</td>
                                      <td className="px-1 py-0 whitespace-nowrap text-center !align-middle"><button type="button" className="btn btn-xs w-full" onClick={() => onStartEdit(node)}>編集</button></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            <table className="table table-xs">
                              <thead>
                                <tr>
                                  <th className="pl-1 pr-0 whitespace-nowrap text-left">ホロメンメモ</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="pl-1 pr-0 text-xs whitespace-pre-wrap align-top cursor-pointer" onClick={() => onOpenNoteModal(holomem)}>{isEmpty(holomem.note) ? '-' : holomem.note}</td>  { }
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </section>
              );
            })
          )}
          
          <div className="text-right">
            <button type="button" className="btn btn-info" onClick={onStartCreate}>新規マス追加</button>
          </div>
        </>
      )}
      
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h2 className="mb-4 text-lg font-bold">{editingId == null ? '新規マス追加' : `マス編集 (ID : ${editingId})`}</h2>
            
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
                
                {/* カテゴリは新規登録時のみ設定可能・編集時は参照のみで変更不可 */}
                <label className="fieldset-label">{categoryDisplayName}</label>
                <select className={`select w-full ${categoryColourClassSelect[form.category]}`} name="category" value={form.category} onChange={onChangeForm} disabled={editingId != null}>
                  {boardNodeCategories.map(category => (
                    <option key={category} value={category}>{categoryDisplayNames[category]}</option>
                  ))}
                </select>
                
                {/* 黄マス時の報酬アップ対象アイテムは新規登録時のみ設定可能・編集時は参照のみで変更不可 */}
                <label className="fieldset-label">{yellowTargetDisplayName}</label>
                <select className="select w-full" name="yellow_target" value={form.yellow_target} onChange={onChangeForm} disabled={editingId != null || form.category !== boardNodeCategoryYellow}>
                  <option value="">(選択してください)</option>
                  {boardNodeYellowTargets.map(yellowTarget => (
                    <option key={yellowTarget} value={yellowTarget}>{yellowTargetDisplayNames[yellowTarget]}</option>
                  ))}
                </select>
                
                <label className="fieldset-label">{descriptionDisplayName}</label>
                <textarea className="textarea w-full min-h-24" name="description" value={form.description} onChange={onChangeForm} required />
                
                <label className="fieldset-label">{amountDisplayName}</label>
                <input className="input w-full" name="amount" type="number" step="any" value={form.amount} onChange={onChangeForm} required />
                
                <label className="fieldset-label">{connectRateDisplayName}</label>
                <input className="input w-full" name="connect_rate" type="number" step="any" value={form.connect_rate} onChange={onChangeForm} />
                
                <label className="fieldset-label">{isUnlockedDisplayName}</label>
                <input className="checkbox" type="checkbox" name="is_unlocked" checked={form.is_unlocked === booleanStringTrue} onChange={onChangeIsUnlocked} />
              </fieldset>
              
              <div className="modal-action justify-between">
                {editingId != null && (<button type="button" className="btn btn-error" onClick={onDelete} disabled={isSubmitting}>削除する</button>)}
                <button type="button" className="btn" onClick={onCloseModal} disabled={isSubmitting}>キャンセル</button>
                <button type="submit" className="btn btn-info" disabled={isSubmitting}>{editingId == null ? '追加する' : '更新する'}</button>
              </div>
            </form>
          </div>
          
          <div className="modal-backdrop" onClick={onCloseModal} />
        </div>
      )}
      
      {noteTargetHolomem != null && (
        <HolomemNoteModal
          holomem={noteTargetHolomem}
          onClose={onCloseNoteModal}
          onUpdated={onUpdateHolomemNote}
        />
      )}
    </main>
  );
}

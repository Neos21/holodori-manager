import { type ChangeEvent, type ReactElement, type SubmitEvent, useEffect, useState } from 'react';

import { boardNodeYellowTargets } from '../../../shared/constants/app-constants';
import { booleanNumberTrue, booleanStringFalse, booleanStringTrue } from '../../../shared/constants/boolean-constants';
import { boardNodeCategories, boardNodeCategoryYellow } from '../../../shared/constants/holodori-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { amountDisplayName, boardNodeSchema, categoryDisplayName, connectRateDisplayName, descriptionDisplayName, holomemsIdDisplayName, isUnlockedDisplayName, yellowTargetDisplayName } from '../../../shared/schemas/board-node-schema';
import { groupNameDisplayName, holomemSchema, nameDisplayName, noteDisplayName } from '../../../shared/schemas/holomem-schema';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { BoardNodeYellowTarget } from '../../../shared/types/app-types';
import type { BoardNodeDisplay } from '../../../shared/types/board-node';
import type { BooleanString } from '../../../shared/types/boolean-types';
import type { BoardNodeCategory } from '../../../shared/types/holodori-types';
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
  holomems_id: NumberToStringValue;
  note       : string;
};

const categoryDisplayNames: Record<BoardNodeCategory, string> = {
  yellow: '黄マス',
  green : '緑マス',
  red   : '赤マス',
  blue  : '青マス'
};

const yellowTargetDisplayNames: Record<BoardNodeYellowTarget, string> = {
  cube     : 'キューブ',
  training : '特訓アイテム',
  lesson_pt: 'レッスン Pt'
};

/** 空のボードノードフォーム値を返す */
const createEmptyBoardNodeFormValues = (): BoardNodeFormState => ({
  holomems_id  : '',
  category     : boardNodeCategoryYellow,
  yellow_target: '',
  description  : '',
  is_unlocked  : booleanStringFalse,
  amount       : '',
  connect_rate : ''
});

/** 空のホロメンメモフォーム値を返す */
const createEmptyHolomemNoteFormValues = (): HolomemNoteFormState => ({
  holomems_id: '',
  note       : ''
});

export default function BoardNodesPage(): ReactElement {
  const [isLoading , setIsLoading ] = useState<boolean>(true);
  const [boardNodes, setBoardNodes] = useState<Array<BoardNodeDisplay>>([]);
  
  const [form        , setForm        ] = useState<BoardNodeFormState>(createEmptyBoardNodeFormValues());
  const [editingId   , setEditingId   ] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [holomemNoteForm    , setHolomemNoteForm    ] = useState<HolomemNoteFormState>(createEmptyHolomemNoteFormValues());
  const [isSavingHolomemNote, setIsSavingHolomemNote] = useState<boolean>(false);
  const [errorMessage       , setErrorMessage       ] = useState<string>('');
  
  const onLoadData = async (): Promise<void> => {
    try {
      const boardNodesResponse = await adminApi.get('/api/board-nodes').json<{ result: Array<BoardNodeDisplay>; }>();
      setBoardNodes(boardNodesResponse.result);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ホロメンボード一覧の取得に失敗しました'));
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
  
  const onStartEditBoardNode = (boardNode: BoardNodeDisplay): void => {
    setEditingId(boardNode.id);
    setForm({
      holomems_id  : String(boardNode.holomems_id) as NumberToStringValue,
      category     : boardNode.category,
      yellow_target: boardNode.yellow_target ?? '',
      description  : boardNode.description,
      is_unlocked  : String(boardNode.is_unlocked) as BooleanString,
      amount       : String(boardNode.amount) as NumberToStringValue,
      connect_rate : isEmpty(boardNode.connect_rate) ? '' : String(boardNode.connect_rate) as NumberToStringValue
    });
    setErrorMessage('');
  };
  
  const onChangeForm = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setForm(prevForm => ({ ...prevForm, [name]: value } as BoardNodeFormState));
  };
  
  const onChangeUnlocked = (event: ChangeEvent<HTMLInputElement>): void => {
    setForm(prevForm => ({ ...prevForm, is_unlocked: event.target.checked ? booleanStringTrue : booleanStringFalse }));
  };
  
  const onResetForm = (): void => {
    setEditingId(null);
    setForm(createEmptyBoardNodeFormValues());
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const parsed = boardNodeSchema.safeParse(form);
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      if(editingId == null) {
        await adminApi.post('/api/board-nodes', { json: parsed.data }).json<{ result: { id: number; }; }>();
      }
      else {
        await adminApi.patch(`/api/board-nodes/${editingId}`, { json: parsed.data });
      }
      await onLoadData();
      onResetForm();
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, editingId == null ? 'ホロメンボードマスの追加に失敗しました' : 'ホロメンボードマスの更新に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onChangeHolomemNote = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    setHolomemNoteForm(prevForm => ({ ...prevForm, [name]: value } as HolomemNoteFormState));
  };
  
  const onSubmitHolomemNote = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const holomemId = Number(holomemNoteForm.holomems_id);
    if(isEmpty(holomemNoteForm.holomems_id) || !Number.isInteger(holomemId)) return setErrorMessage(`${holomemsIdDisplayName} を選択してください`);
    
    const parsed = holomemSchema.pick({ note: true }).safeParse({ note: holomemNoteForm.note });
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
    setIsSavingHolomemNote(true);
    try {
      await adminApi.patch(`/api/holomems/${holomemId}`, { json: parsed.data });
      await onLoadData();
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ホロメンメモの更新に失敗しました'));
    }
    finally {
      setIsSavingHolomemNote(false);
    }
  };
  
  return (
    <main>
      <h1>ホロメンボード管理</h1>
      
      <section>
        <h2>{editingId == null ? 'マスの新規追加' : 'マスの編集'}</h2>
        
        <form onSubmit={onSubmit}>
          <div>
            {/* TODO : 新規追加時にホロメン ID (内部番号) を手入力はキツい。セレクトボックスでホロメン一覧から選択する方針にしたい */}
            <label>
              {holomemsIdDisplayName}
              <input name="holomems_id" type="number" min={1} value={form.holomems_id} onChange={onChangeForm} required />
            </label>
            
            <label>
              {categoryDisplayName}
              <select name="category" value={form.category} onChange={onChangeForm}>
                {boardNodeCategories.map(category => (
                  <option key={category} value={category}>{categoryDisplayNames[category]}</option>
                ))}
              </select>
            </label>
            
            <label>
              {yellowTargetDisplayName}
              <select name="yellow_target" value={form.yellow_target} onChange={onChangeForm} disabled={form.category !== boardNodeCategoryYellow}>
                <option value="">選択してください</option>
                {boardNodeYellowTargets.map(yellowTarget => (
                  <option key={yellowTarget} value={yellowTarget}>{yellowTargetDisplayNames[yellowTarget]}</option>
                ))}
              </select>
            </label>
            
            <label>
              {descriptionDisplayName}
              <textarea name="description" value={form.description} onChange={onChangeForm} required />
            </label>
            
            <label>
              {isUnlockedDisplayName}
              <input type="checkbox" name="is_unlocked" checked={form.is_unlocked === booleanStringTrue} onChange={onChangeUnlocked} />
            </label>
            
            <label>
              {amountDisplayName}
              <input name="amount" type="number" step="any" value={form.amount} onChange={onChangeForm} required />
            </label>
            
            <label>
              {connectRateDisplayName}
              <input name="connect_rate" type="number" step="any" value={form.connect_rate} onChange={onChangeForm} />
            </label>
          </div>
          
          <div>
            <button type="submit" disabled={isSubmitting}>{editingId == null ? '追加する' : '更新する'}</button>
            
            <button type="button" onClick={onResetForm} disabled={isSubmitting}>キャンセル</button>
          </div>
        </form>
      </section>
      
      {/* TODO : テーブル内に表示しその場で編集可能にしたい。1ホロメンにつき1メモなので行結合して表示すれば良さそうだが詳細な UI や実装方針は後ほど再検討する */}
      <section>
        <h2>ホロメンメモ</h2>
        
        <form onSubmit={onSubmitHolomemNote}>
          <label>
            ホロメン
            <input name="holomems_id" type="number" min={1} value={holomemNoteForm.holomems_id} onChange={onChangeHolomemNote} required />
          </label>
          
          <label>
            {noteDisplayName}
            <textarea name="note" value={holomemNoteForm.note} onChange={onChangeHolomemNote} />
          </label>
          
          <button type="submit" disabled={isSavingHolomemNote}>メモを更新する</button>
        </form>
      </section>
      
      {!isEmpty(errorMessage) && (
        <div className="alert-danger">{errorMessage}</div>
      )}
      
      {isLoading ? (
        <div className="label-warning">読込中…</div>
      ) : (
        boardNodeCategories.map(category => {
          const categorizedBoardNodes = boardNodes.filter(boardNode => boardNode.category === category);
          return (
            <section key={category}>
              <h2>{categoryDisplayNames[category]}</h2>
              {categorizedBoardNodes.length === 0 ? (
                <div>登録されているマスはありません。</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>{groupNameDisplayName}</th>
                      <th>{nameDisplayName}</th>
                      <th>{noteDisplayName}</th>
                      <th>{yellowTargetDisplayName}</th>
                      <th>{descriptionDisplayName}</th>
                      <th>{isUnlockedDisplayName}</th>
                      <th>{amountDisplayName}</th>
                      <th>{connectRateDisplayName}</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorizedBoardNodes.map(boardNode => (
                        <tr key={boardNode.id}>
                          <td>{boardNode.holomem_group_name}</td>
                          <td>{boardNode.holomem_name}</td>
                          <td>{boardNode.holomem_note ?? '—'}</td>
                          <td>{isEmpty(boardNode.yellow_target) ? '—' : yellowTargetDisplayNames[boardNode.yellow_target!]}</td>
                          <td>{boardNode.description}</td>
                          <td>{boardNode.is_unlocked === booleanNumberTrue ? '◯' : '×'}</td>
                          <td>{boardNode.amount}</td>
                          <td>{boardNode.connect_rate ?? '—'}</td>
                          <td><button type="button" onClick={() => onStartEditBoardNode(boardNode)}>編集</button></td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}

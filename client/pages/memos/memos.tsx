import { type ChangeEvent, type ReactElement, useEffect, useState } from 'react';
import { useBlocker } from 'react-router';

import { defaultMemoId } from '../../../shared/constants/app-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { memoSchema } from '../../../shared/schemas/memo-schema';
import { failedToCreateMessage, failedToDeleteMessage, failedToUpdateMessage } from '../../constants/client-messages';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useMemosStore } from '../../stores/memos-store';

import type { Memo } from '../../../shared/types/entities/memo';

const discardChangesConfirmationMessage = '変更内容が破棄されてしまいますがよろしいですか？' as const;

/** 複数の自由メモを管理するページ */
export default function MemosPage(): ReactElement {
  const [isLoading   , setIsLoading   ] = useState<boolean>(true);          // 初期読込中か否か
  const [editingId   , setEditingId   ] = useState<number>(defaultMemoId);  // 編集中のメモ ID・初期表示はデフォルトメモ
  const [content     , setContent     ] = useState<string>('');             // 編集中のメモ本文・未入力時は空文字
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);         // 追加・更新・削除の送信中か否か
  const [pageError   , setPageError   ] = useState<string>('');             // 一覧取得・入力・API エラー
  
  const memos = useMemosStore(state => state.memos);  // サイドメニューと共有する ID 昇順のメモ一覧
  
  /** 編集中の保存済みメモ・一覧取得前または対象が存在しない場合は `null` */
  const editingMemo = memos.find(memo => memo.id === editingId) ?? null;
  /** 保存済みの内容からフォームが変更されているか否かを導出する */
  const isDirty = content !== (editingMemo?.content ?? '');
  
  /** ページ遷移前に確認を入れるための Blocker */
  const blocker = useBlocker(isDirty);
  
  // 未保存の変更がある状態で別ページへ遷移する場合は、承認された時だけ遷移を続行する
  useEffect(() => {
    if(blocker.state !== 'blocked') return;
    if(window.confirm(discardChangesConfirmationMessage)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  
  // 初期表示時にメモ一覧を取得し、デフォルトのメモを編集開始状態にする
  useEffect(() => {
    (async () => {
      try {
        const result = await useMemosStore.getState().loadMemos();
        if(result.error != null) setPageError(result.error);
        else setContent(result.result.find(memo => memo.id === defaultMemoId)?.content ?? '');
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  // Store 内の編集中メモが他方のコンポーネントから更新された場合は、入力途中の内容も保存済みの最新内容で置き換える
  useEffect(() => {
    return useMemosStore.subscribe((state, prevState) => {
      const updatedMemo = state.memos.find(memo => memo.id === editingId) ?? null;
      const prevMemo = prevState.memos.find(memo => memo.id === editingId) ?? null;
      if(updatedMemo == null || updatedMemo === prevMemo) return;
      setContent(updatedMemo.content ?? '');
    });
  }, [editingId]);
  
  /** メモ本文の入力値をフォーム State に反映する */
  const onChangeContent = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(event.target.value);
    if(!isEmpty(pageError)) setPageError('');
  };
  
  /** 未保存の変更を確認したうえで、指定されたメモを編集開始状態にする */
  const onChangeEditingMemo = (memo: Memo): void => {
    if(memo.id === editingId) return;
    if(isDirty && !window.confirm(discardChangesConfirmationMessage)) return;
    
    setEditingId(memo.id);
    setContent(memo.content ?? '');
    setPageError('');
  };
  
  /** 未保存の変更を確認したうえで空のメモを追加し、作成されたメモを編集開始状態にする */
  const onCreate = async (): Promise<void> => {
    if(isDirty && !window.confirm(discardChangesConfirmationMessage)) return;
    
    setPageError('');
    setIsSubmitting(true);
    try {
      const response = await adminApi.post('/api/memos', { json: { content: null } }).json<{ result: { id: number; }; }>();
      const createdMemo: Memo = { id: response.result.id, content: null };
      useMemosStore.getState().setMemo(createdMemo);
      setEditingId(createdMemo.id);
      setContent('');
    }
    catch(error) {
      setPageError(extractApiErrorMessage(error, failedToCreateMessage('メモ')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** 編集中のメモを検証して更新する */
  const onUpdate = async (): Promise<void> => {
    setPageError('');
    
    const parsed = memoSchema.safeParse({ content });
    if(!parsed.success) return setPageError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      await adminApi.patch(`/api/memos/${editingId}`, { json: parsed.data });
      const savedContent = parsed.data.content ?? '';
      setContent(savedContent);
      useMemosStore.getState().setMemo({ id: editingId, content: savedContent });
    }
    catch(error) {
      setPageError(extractApiErrorMessage(error, failedToUpdateMessage('メモ')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** 確認後に編集中のメモを削除し、デフォルトのメモへ切り替える */
  const onDelete = async (): Promise<void> => {
    if(editingId === defaultMemoId) return window.alert('デフォルトのメモは削除できません');
    if(!window.confirm('このメモを削除しますか？')) return;
    
    setPageError('');
    setIsSubmitting(true);
    try {
      await adminApi.delete(`/api/memos/${editingId}`);
      const defaultMemo = memos.find(memo => memo.id === defaultMemoId);
      useMemosStore.getState().removeMemo(editingId);
      setEditingId(defaultMemoId);
      setContent(defaultMemo?.content ?? '');
    }
    catch(error) {
      setPageError(extractApiErrorMessage(error, failedToDeleteMessage('メモ')));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main>
      <h1>メモ</h1>
      
      {!isEmpty(pageError) && (
        <div className="alert alert-error alert-soft mb-4">{pageError}</div>
      )}
      
      <section className="mb-4">
        <div className="flex flex-wrap gap-2">
          {memos.map(memo => (
            <button key={memo.id} type="button" className={`btn btn-sm ${memo.id === editingId ? 'btn-success' : ''}`} onClick={() => onChangeEditingMemo(memo)} disabled={isLoading || isSubmitting}>{memo.id}</button>
          ))}
        </div>
      </section>
      
      <p className="mb-2 flex items-center justify-between gap-2">
        <span>ID : {editingId}</span>
        <span className="flex gap-2">
          <button type="button" className="btn btn-sm btn-info"  onClick={onUpdate} disabled={isLoading || isSubmitting || !isDirty}>保存</button>
          <button type="button" className="btn btn-sm btn-error" onClick={onDelete} disabled={isLoading || isSubmitting}            >削除</button>
        </span>
      </p>
      
      <textarea
        className="textarea w-full min-h-80 mb-4"
        name="content" value={content} placeholder="メモ"
        onChange={onChangeContent} readOnly={isLoading || isSubmitting}
      />
      
      <p className="text-right">
        <button type="button" className="btn btn-info" onClick={onCreate} disabled={isLoading || isSubmitting}>新規追加</button>
      </p>
    </main>
  );
}

import { type ChangeEvent, type ReactElement, useEffect, useRef, useState } from 'react';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { memoSchema } from '../../../shared/schemas/memo-schema';
import { failedToFetchMessage, generalFailedMessage } from '../../constants/client-messages';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';

import type { Memo as MemoType } from '../../../shared/types/entities/memo';

/** 保存成功メッセージを表示する時間 (ms) */
const savedMessageDurationMilliseconds = 3000;

/** 保存日時を日本時間の `YYYY-MM-DD HH:mm:ss` 形式に変換する */
const formatSavedAt = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone : 'Asia/Tokyo',
    hourCycle: 'h23',  // 0～23 で表記する 24 時制
    year     : 'numeric',
    month    : '2-digit',
    day      : '2-digit',
    hour     : '2-digit',
    minute   : '2-digit',
    second   : '2-digit'
  });
  // ロケール固有の区切り文字に依存せず日時を組み立てるため、各要素を種類ごとに Map に格納する
  const parts = new Map(formatter.formatToParts(date).map(part => [part.type, part.value]));
  const getPart = (type: Intl.DateTimeFormatPartTypes): string => parts.get(type) ?? '';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
};

/** サイドメニューに常時表示する自由メモ編集欄 */
export const Memo = (): ReactElement => {
  const [isLoading   , setIsLoading   ] = useState<boolean>(true);   // 初期読込中か否か・`true` の場合はテキストエリアを操作不可にする
  const [content     , setContent     ] = useState<string>('');      // メモ欄
  const [isSaving    , setIsSaving    ] = useState<boolean>(false);  // 保存中か否か・`true` の場合はテキストエリアを操作不可にする
  const [savedMessage, setSavedMessage] = useState<string>('');      // 保存成功時のメッセージ・一定秒数経過後に非表示になる
  const [errorMessage, setErrorMessage] = useState<string>('');      // エラーメッセージ
  const [lastSavedAt , setLastSavedAt ] = useState<string>('');      // 空文字は現在の画面でまだ保存に成功していない状態を表す
  
  const savedContentRef = useRef<string>('');                    // API 取得時または保存成功時の内容を保持し、変更がない場合の重複保存を避ける
  const savedMessageTimeoutIdRef = useRef<number | null>(null);  // 保存成功メッセージを非表示にするタイマー ID
  
  // 初期表示時に保存済みメモを取得する
  useEffect(() => {
    (async () => {
      try {
        const response = await adminApi.get('/api/memo').json<{ result: MemoType | null; }>();
        const loadedContent = response.result?.content ?? '';
        setContent(loadedContent);
        savedContentRef.current = loadedContent;
      }
      catch(error) {
        setErrorMessage(extractApiErrorMessage(error, failedToFetchMessage('メモ')));
      }
      finally {
        setIsLoading(false);
      }
    })();
    
    // コンポーネント破棄時に余計なタイマーを残さないようにする
    return (): void => {
      if(savedMessageTimeoutIdRef.current != null) window.clearTimeout(savedMessageTimeoutIdRef.current);
    };
  }, []);
  
  /** 自由メモ入力時 */
  const onChangeContent = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setContent(event.target.value);
    if(!isEmpty(errorMessage)) setErrorMessage('');
  };
  
  /** 自由メモからフォーカスが外れた時に、変更があれば保存する */
  const onSaveMemo = async (): Promise<void> => {
    if(isSaving === true || content === savedContentRef.current) return;  // 保存中・変更がない場合は操作しない
    
    setErrorMessage('');
    setSavedMessage('');
    
    // 保存成功メッセージのタイマーがあれば一度無効化してメッセージを非表示にしておく
    if(savedMessageTimeoutIdRef.current != null) {
      window.clearTimeout(savedMessageTimeoutIdRef.current);
      savedMessageTimeoutIdRef.current = null;
    }
    
    const parsed = memoSchema.safeParse({ content });
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
    setIsSaving(true);
    try {
      await adminApi.patch('/api/memo', { json: parsed.data });
      
      const savedContent = parsed.data.content ?? '';  // Zod により処理された内容で更新する
      setContent(savedContent);
      savedContentRef.current = savedContent;
      
      setLastSavedAt(formatSavedAt(new Date()));
      
      // 保存成功メッセージを表示し、一定秒数経過後に非表示にするタイマーを設定する
      setSavedMessage('保存しました');
      savedMessageTimeoutIdRef.current = window.setTimeout((): void => {
        setSavedMessage('');
        savedMessageTimeoutIdRef.current = null;
      }, savedMessageDurationMilliseconds);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, generalFailedMessage('保存')));
    }
    finally {
      setIsSaving(false);
    }
  };
  
  return (
    <section>
      <textarea
        className="textarea textarea-sm w-full min-h-40 mb-1"
        name="memo" value={content} onChange={onChangeContent} onBlur={onSaveMemo} readOnly={isLoading || isSaving}
      />
      
      <p className="mb-1 text-xs">最終保存 : {isEmpty(lastSavedAt) ? '-' : lastSavedAt}</p>
      
      {!isEmpty(errorMessage) && (
        <p className="text-error font-bold text-xs">{errorMessage}</p>
      )}
      
      {!isEmpty(savedMessage) && (
        <p className="text-success font-bold text-xs">{savedMessage}</p>
      )}
    </section>
  );
};

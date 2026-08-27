import { CommandType, type IWorkbookData } from '@univerjs/core';
import { UniverSheetsConditionalFormattingPreset } from '@univerjs/preset-sheets-conditional-formatting';
import UniverPresetSheetsConditionalFormattingJaJP from '@univerjs/preset-sheets-conditional-formatting/locales/ja-JP';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreJaJP from '@univerjs/preset-sheets-core/locales/ja-JP';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { HTTPError } from 'ky';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router';

import { SheetsLoadingOverlay } from './sheets-loading-overlay';
import { localStorageKeyWorkbookZoomRatios } from '../../../constants/client-constants';
import { failedToFetchMessage, failedToUpdateMessage } from '../../../constants/client-messages';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import '@univerjs/preset-sheets-core/lib/index.css';
import '@univerjs/preset-sheets-conditional-formatting/lib/index.css';

/** 単一レコード運用とするため `workbooks.id = 1` のレコードのみを取り扱う */
const workbookId = 1 as const;
/** 自動保存を行う際の遅延時間 */
const autoSaveDelayMs = 2000 as const;
/** サーバに保存する標準ズーム倍率 */
const persistedZoomRatio = 1 as const;
/** Univer が許容するズーム倍率の下限 */
const minimumZoomRatio = 0.1 as const;
/** Univer が許容するズーム倍率の上限 */
const maximumZoomRatio = 4 as const;

/** 保存状況を示すステート型 */
type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
/** シート ID ごとにこのブラウザで使用するズーム倍率を保持する型 */
type WorkbookZoomRatios = Record<string, number>;

/** 初回表示時にデータがない場合に作成する200行・20列のワークブック */
const initialWorkbookData = {
  id        : 'holodori-manager-workbook',
  name      : 'ホロドリ管理',
  locale    : LocaleType.JA_JP,
  sheetOrder: ['sheet-1'],
  sheets    : {
    'sheet-1': {
      id         : 'sheet-1',
      name       : 'シート1',
      rowCount   : 200,
      columnCount: 20
    }
  }
} satisfies Partial<IWorkbookData>;

/** LocalStorage から有効なシート別ズーム倍率だけを読み込む */
const loadZoomRatios = (): WorkbookZoomRatios => {
  try {
    const stored = JSON.parse(localStorage.getItem(localStorageKeyWorkbookZoomRatios) ?? '{}') as unknown;
    if(typeof stored !== 'object' || stored == null || Array.isArray(stored)) return {};
    return Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, number] => {
      const zoomRatio = entry[1];
      return typeof zoomRatio === 'number'
        && Number.isFinite(zoomRatio)
        && zoomRatio >= minimumZoomRatio
        && zoomRatio <= maximumZoomRatio;
    }));
  }
  catch {
    return {};
  }
};

/** 読込データのズーム倍率をこのブラウザの設定で上書きする */
const applyLocalZoomRatios = (snapshot: Partial<IWorkbookData>, zoomRatios: WorkbookZoomRatios): Partial<IWorkbookData> => {
  if(snapshot.sheets == null) return snapshot;
  return {
    ...snapshot,
    sheets: Object.fromEntries(Object.entries(snapshot.sheets).map(([sheetId, sheet]) => [
      sheetId,
      { ...sheet, zoomRatio: zoomRatios[sheetId] ?? persistedZoomRatio }
    ]))
  };
};

/** デバイス固有のズーム倍率を除外してサーバ保存用データを作成する */
const createPersistedSnapshot = (snapshot: IWorkbookData): IWorkbookData => {
  return {
    ...snapshot,
    sheets: Object.fromEntries(Object.entries(snapshot.sheets).map(([sheetId, sheet]) => [
      sheetId,
      { ...sheet, zoomRatio: persistedZoomRatio }
    ]))
  };
};

/** Univer Sheets で単一ワークブックを閲覧・編集する領域 */
export default function UniverSheet(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);                // ワークブックの表示領域の参照
  const onSaveRef    = useRef<(() => Promise<void>) | null>(null);  // 再保存ボタンから Effect 内で生成した保存処理を呼び出すための参照
  
  const [isLoading, setIsLoading] = useState<boolean>(true);       // ワークブックの初期読込・初回描画中か否か
  const [saveState, setSaveState] = useState<SaveState>('saved');  // 自動保存の進行・成否
  const [pageError, setPageError] = useState<string>('');          // 読込または保存 API のエラー
  
  /** 保存完了前の編集が残っているか否かを導出する */
  const hasUnsavedChanges = saveState !== 'saved';
  /** ページ遷移前に確認を入れるための Blocker */
  const blocker = useBlocker(hasUnsavedChanges);
  
  // 未保存の変更がある状態で別ページに遷移する場合は、承認された時だけ遷移を続行する
  useEffect(() => {
    if(blocker.state !== 'blocked') return;
    if(window.confirm('保存されていない変更が破棄されてしまいますがよろしいですか？')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  
  // 未保存の変更がある状態で再読込・タブ終了しようとした場合はブラウザ標準の確認を表示する
  useEffect(() => {
    if(hasUnsavedChanges !== true) return;
    const onBeforeUnload = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return (): void => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);
  
  // 保存済みスナップショットまたは空の初期データから Univer を初期化し、データ変更を自動保存する
  useEffect(() => {
    let isDisposed = false;
    let commandDisposable: { dispose: () => void; } | null = null;
    let zoomDisposable: { dispose: () => void; } | null = null;
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    let editGeneration = 0;
    let savedGeneration = 0;
    let isSaving = false;
    let univerAPI: ReturnType<typeof createUniver>['univerAPI'] | null = null;
    const zoomRatios = loadZoomRatios();
    
    /** 保留中のタイマーを置き換えて、最後の編集から一定時間後に保存する */
    const scheduleSave = (): void => {
      if(saveTimeout != null) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => void onSave(), autoSaveDelayMs);
    };
    
    /** 現在のワークブック全体を保存し、保存中の追加編集は次回の保存対象として残す */
    const onSave = async (): Promise<void> => {
      if(isDisposed || univerAPI == null) return;
      if(isSaving) return scheduleSave();
      
      const workbook = univerAPI.getActiveWorkbook();
      if(workbook == null) return;
      
      const savingGeneration = editGeneration;
      isSaving = true;
      setSaveState('saving');
      setPageError('');
      try {
        const snapshot = createPersistedSnapshot(workbook.save());
        await adminApi.put(`/api/workbooks/${workbookId}`, { json: { snapshot } });
        savedGeneration = savingGeneration;
        if(isDisposed) return;
        if(editGeneration === savedGeneration) setSaveState('saved');
        else {
          setSaveState('dirty');
          scheduleSave();
        }
      }
      catch(error) {
        if(isDisposed) return;
        setSaveState('error');
        setPageError(extractApiErrorMessage(error, failedToUpdateMessage('ワークブック')));
      }
      finally {
        isSaving = false;
      }
    };
    onSaveRef.current = onSave;
    
    // データを読み込み Univer Sheets を生成する
    (async () => {
      let snapshot: Partial<IWorkbookData> = initialWorkbookData;
      let shouldCreateWorkbook = false;
      try {
        const response = await adminApi.get(`/api/workbooks/${workbookId}`).json<{ result: { id: number; snapshot: IWorkbookData; }; }>();
        snapshot = response.result.snapshot;
      }
      catch(error) {
        if(error instanceof HTTPError && error.response.status === 404) shouldCreateWorkbook = true;
        else {
          if(!isDisposed) {
            setPageError(extractApiErrorMessage(error, failedToFetchMessage('ワークブック')));
            setIsLoading(false);
          }
          return;
        }
      }
      
      if(isDisposed || containerRef.current == null) return;
      const created = createUniver({
        locale : LocaleType.JA_JP,
        locales: {
          [LocaleType.JA_JP]: mergeLocales(
            UniverPresetSheetsCoreJaJP,
            UniverPresetSheetsConditionalFormattingJaJP
          )
        },
        presets: [
          UniverSheetsCorePreset({ container: containerRef.current }),
          UniverSheetsConditionalFormattingPreset()
        ]
      });
      univerAPI = created.univerAPI;
      univerAPI.createWorkbook(applyLocalZoomRatios(snapshot, zoomRatios));
      commandDisposable = univerAPI.addEvent(univerAPI.Event.CommandExecuted, event => {
        if(event.type !== CommandType.MUTATION) return;
        editGeneration += 1;
        setSaveState('dirty');
        setPageError('');
        scheduleSave();
      });
      zoomDisposable = univerAPI.addEvent(univerAPI.Event.SheetZoomChanged, event => {
        zoomRatios[event.worksheet.getSheetId()] = event.zoom;
        localStorage.setItem(localStorageKeyWorkbookZoomRatios, JSON.stringify(zoomRatios));
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if(!isDisposed) setIsLoading(false);
      }));
      
      if(shouldCreateWorkbook) {
        editGeneration += 1;
        setSaveState('dirty');
        await onSave();
      }
    })();
    
    // コンポーネント破棄時の処理
    return (): void => {
      isDisposed = true;
      if(saveTimeout != null) clearTimeout(saveTimeout);
      commandDisposable?.dispose();
      zoomDisposable?.dispose();
      univerAPI?.dispose();
      onSaveRef.current = null;
    };
  }, []);
  
  /** 保存失敗後に現在のワークブックを再保存する */
  const onRetrySave = (): void => void onSaveRef.current?.();
  
  // 親コンポーネントで `flex` を入れているため、その子要素として振る舞う
  return (
    <>
      <div className="flex min-h-8 items-center justify-end gap-2 border-b border-base-300 px-2 text-xs">
        {!isLoading && saveState === 'saved'  && (<span className="text-success">保存済み</span>)}
        {!isLoading && saveState === 'dirty'  && (<span>保存待ち</span>)}
        {!isLoading && saveState === 'saving' && (<span>保存中</span>)}
        {!isLoading && saveState === 'error'  && (<span className="text-error">保存失敗</span>)}
        {saveState === 'error' && (
          <button type="button" className="btn btn-error btn-xs" onClick={onRetrySave}>再保存</button>
        )}
      </div>
      
      {!isLoading && pageError !== '' && (
        <div className="alert rounded-none alert-soft py-2 text-xs alert-error">{pageError}</div>
      )}
      
      <div ref={containerRef} className="min-h-0 flex-1" />
      
      {isLoading && (<SheetsLoadingOverlay />)}
    </>
  );
}

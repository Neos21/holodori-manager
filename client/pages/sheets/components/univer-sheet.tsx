import { CommandType, type IWorkbookData, LocaleType, mergeLocales, Univer } from '@univerjs/core';
import { FUniver } from '@univerjs/core/facade';
import DesignJaJP from '@univerjs/design/locale/ja-JP';
import { UniverDocsPlugin } from '@univerjs/docs';
import { UniverDocsUIPlugin } from '@univerjs/docs-ui';
import DocsUIJaJP from '@univerjs/docs-ui/locale/ja-JP';
import { UniverFormulaEnginePlugin } from '@univerjs/engine-formula';
import { UniverRenderEnginePlugin } from '@univerjs/engine-render';
import { UniverSheetsConditionalFormattingPreset } from '@univerjs/preset-sheets-conditional-formatting';
import UniverPresetSheetsConditionalFormattingJaJP from '@univerjs/preset-sheets-conditional-formatting/locales/ja-JP';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreJaJP from '@univerjs/preset-sheets-core/locales/ja-JP';
import { createUniver } from '@univerjs/presets';
import { UniverSheetsPlugin } from '@univerjs/sheets';
import SheetsJaJP from '@univerjs/sheets/locale/ja-JP';
import { UniverSheetsConditionalFormattingPlugin } from '@univerjs/sheets-conditional-formatting';
import { UniverSheetsConditionalFormattingUIPlugin } from '@univerjs/sheets-conditional-formatting-ui';
import SheetsConditionalFormattingUIJaJP from '@univerjs/sheets-conditional-formatting-ui/locale/ja-JP';
import { UniverSheetsFormulaPlugin } from '@univerjs/sheets-formula';
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui';
import SheetsFormulaUIJaJP from '@univerjs/sheets-formula-ui/locale/ja-JP';
import { UniverSheetsNumfmtPlugin } from '@univerjs/sheets-numfmt';
import { UniverSheetsNumfmtUIPlugin } from '@univerjs/sheets-numfmt-ui';
import SheetsNumfmtUIJaJP from '@univerjs/sheets-numfmt-ui/locale/ja-JP';
import { UniverSheetsMobileUIPlugin } from '@univerjs/sheets-ui';
import SheetsUIJaJP from '@univerjs/sheets-ui/locale/ja-JP';
import { UniverMobileUIPlugin } from '@univerjs/ui';
import UIJaJP from '@univerjs/ui/locale/ja-JP';
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
/** アプリのデスクトップレイアウトへ切り替わる最小幅 */
const desktopLayoutMinimumWidth = 1024 as const;

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

/**
 * 狭い画面を使用するタッチ式モバイル端末か否かを判定する
 * 
 * タッチ対応 PC をモバイル UI に切り替えないよう、画面幅とタッチポイントに加えて UA も確認する
 * iPadOS はデスクトップ表示時に Macintosh を名乗るため、複数タッチ可能な Macintosh も対象に含める
 */
const isMobileTouchDevice = (): boolean => {
  const isNarrowViewport = window.innerWidth < desktopLayoutMinimumWidth;
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  const isMobileUserAgent = (/Android|iPhone|iPad|iPod|Mobile/i).test(navigator.userAgent);
  const isIPadDesktopUserAgent = (/Macintosh/i).test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  return isNarrowViewport && hasTouchPoints && (isMobileUserAgent || isIPadDesktopUserAgent);
};

/** 公式のモバイル構成に必要なプラグインを登録して Univer API を生成する */
const createMobileUniver = (container: HTMLDivElement): FUniver => {
  const univer = new Univer({
    locale : LocaleType.JA_JP,
    locales: {
      [LocaleType.JA_JP]: mergeLocales(
        DesignJaJP,
        UIJaJP,
        DocsUIJaJP,
        SheetsJaJP,
        SheetsUIJaJP,
        SheetsFormulaUIJaJP,
        SheetsNumfmtUIJaJP,
        SheetsConditionalFormattingUIJaJP
      )
    }
  });
  
  univer.registerPlugin(UniverRenderEnginePlugin);
  univer.registerPlugin(UniverFormulaEnginePlugin);
  univer.registerPlugin(UniverMobileUIPlugin, { container });
  univer.registerPlugin(UniverDocsPlugin);
  univer.registerPlugin(UniverDocsUIPlugin);
  univer.registerPlugin(UniverSheetsPlugin);
  univer.registerPlugin(UniverSheetsMobileUIPlugin);
  univer.registerPlugin(UniverSheetsFormulaPlugin);
  univer.registerPlugin(UniverSheetsFormulaUIPlugin);
  univer.registerPlugin(UniverSheetsNumfmtPlugin);
  univer.registerPlugin(UniverSheetsNumfmtUIPlugin);
  univer.registerPlugin(UniverSheetsConditionalFormattingPlugin);
  // モバイル版 (UniverSheetsConditionalFormattingMobileUIPlugin) は v0.25.1 で描画 Controller を起動せず条件付き書式の背景色等が反映されないため、描画処理を起動する通常版を使用する
  univer.registerPlugin(UniverSheetsConditionalFormattingUIPlugin);
  return FUniver.newAPI(univer);
};

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
      
      // デバイスに応じた Univer Sheets を作る : タッチ可能か否かを重視しているので画面幅だけで後から切り替わる挙動はしない
      if(isMobileTouchDevice()) {
        univerAPI = createMobileUniver(containerRef.current);
      }
      else {
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
      }
      
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

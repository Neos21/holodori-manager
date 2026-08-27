import { lazy, type ReactElement, Suspense } from 'react';

import { SheetsLoadingOverlay } from './components/sheets-loading-overlay';

const UniverSheet = lazy(() => import('./components/univer-sheet'));

/** Univer の読込中からローディング表示を行うスプレッドシートページ */
export default function SheetsPage(): ReactElement {
  return (
    <main className="relative flex size-full min-h-0 flex-col overflow-hidden">
      <Suspense fallback={<SheetsLoadingOverlay />}>
        <UniverSheet />
      </Suspense>
    </main>
  );
}

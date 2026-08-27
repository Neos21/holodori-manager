import { type ReactElement } from 'react';

/** スプレッドシートの読込中にページ領域全体を覆う表示 */
export function SheetsLoadingOverlay(): ReactElement {
  // スマホ表示時のヘッダ `.navbar` の Shadow が半透明背景に隠れてしまうのを防ぐため `mt-2 を入れている
  return (
    <div className="absolute inset-0 z-50 mt-2 flex items-center justify-center bg-base-100/70">
      <span className="loading loading-lg loading-spinner" />
    </div>
  );
}

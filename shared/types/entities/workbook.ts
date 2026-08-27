/** Univer Sheets のワークブック */
export type Workbook = {
  /** アプリ上のワークブック ID */
  id: number;
  /** Univer Sheets の `IWorkbookData` を JSON 文字列に変換したスナップショット */
  snapshot: string;
};

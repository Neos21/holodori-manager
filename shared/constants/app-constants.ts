/** ホロメンボードの報酬アップ対象アイテム : キューブ */
export const boardNodeYellowTargetCube     = 'cube'      as const;
/** ホロメンボードの報酬アップ対象アイテム : 特訓アイテム */
export const boardNodeYellowTargetTraining = 'training'  as const;
/** ホロメンボードの報酬アップ対象アイテム : レッスン Pt */
export const boardNodeYellowTargetLessonPt = 'lesson_pt' as const;
/** ホロメンボードの報酬アップ対象となる全アイテム (画面表示順) */
export const boardNodeYellowTargets = [boardNodeYellowTargetCube, boardNodeYellowTargetTraining, boardNodeYellowTargetLessonPt] as const;

/** 物理削除を許可せず、サイドメニューに表示するデフォルトメモの ID */
export const defaultMemoId = 1 as const;

/** D1 の行上限 2MB に対し、管理情報などの余裕を確保したワークブック JSON の最大バイト数 */
export const maxWorkbookSnapshotBytes = 1_900_000 as const;

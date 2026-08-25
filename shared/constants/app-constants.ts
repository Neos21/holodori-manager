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

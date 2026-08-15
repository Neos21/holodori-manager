/** ホロワーク優先モードの選択肢 : 完了回数重視 */
export const candidatePriorityCount    = 'count'     as const;
/** ホロワーク優先モードの選択肢 : キューブ獲得量重視 */
export const candidatePriorityCube     = 'cube'      as const;
/** ホロワーク優先モードの選択肢 : 特訓アイテム獲得量重視 */
export const candidatePriorityTraining = 'training'  as const;
/** ホロワーク優先モードの選択肢 : レッスン Pt 獲得量重視 */
export const candidatePriorityLessonPt = 'lesson_pt' as const;
/** ホロワーク優先モードの全選択肢 (画面表示順) */
export const candidatePriorities = [candidatePriorityCount, candidatePriorityCube, candidatePriorityTraining, candidatePriorityLessonPt] as const;

/** ホロメンボードの報酬アップ対象アイテム : キューブ */
export const boardNodeYellowTargetCube     = 'cube'      as const;
/** ホロメンボードの報酬アップ対象アイテム : 特訓アイテム */
export const boardNodeYellowTargetTraining = 'training'  as const;
/** ホロメンボードの報酬アップ対象アイテム : レッスン Pt */
export const boardNodeYellowTargetLessonPt = 'lesson_pt' as const;
/** ホロメンボードの報酬アップ対象となる全アイテム (画面表示順) */
export const boardNodeYellowTargets = [boardNodeYellowTargetCube, boardNodeYellowTargetTraining, boardNodeYellowTargetLessonPt] as const;

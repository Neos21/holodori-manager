/** 認証によるリダイレクト理由を一時保存する SessionStorage キー */
export const sessionStorageKeyAuthenticationRedirectReason = 'authentication-redirect-reason' as const;
/** 認証によるリダイレクト理由 : 再ログインが必要 */
export const authenticationRedirectReasonReloginRequired   = 'relogin-required' as const;
/** 認証によるリダイレクト理由 : ユーザ操作によるログアウト */
export const authenticationRedirectReasonLogout            = 'logout' as const;

/** ホロワーク優先モードの選択肢 : 完了回数重視 */
export const candidatePriorityCount    = 'count'     as const;
/** ホロワーク優先モードの選択肢 : キューブ獲得量重視 */
export const candidatePriorityCube     = 'cube'      as const;
/** ホロワーク優先モードの選択肢 : 特訓アイテム獲得量重視 */
export const candidatePriorityTraining = 'training'  as const;
/** ホロワーク優先モードの選択肢 : レッスン Pt 獲得量重視 */
export const candidatePriorityLessonPt = 'lesson_pt' as const;
/** ホロワーク優先モードの全選択肢 */
export const candidatePriorities = [candidatePriorityCount, candidatePriorityCube, candidatePriorityTraining, candidatePriorityLessonPt] as const;

/** ホロメンボードの報酬アップ対象アイテム : キューブ */
export const boardNodeYellowTargetCube     = 'cube'      as const;
/** ホロメンボードの報酬アップ対象アイテム : 特訓アイテム */
export const boardNodeYellowTargetTraining = 'training'  as const;
/** ホロメンボードの報酬アップ対象アイテム : レッスン Pt */
export const boardNodeYellowTargetLessonPt = 'lesson_pt' as const;
/** ホロメンボードの報酬アップ対象となる全アイテム */
export const boardNodeYellowTargets = [boardNodeYellowTargetCube, boardNodeYellowTargetTraining, boardNodeYellowTargetLessonPt] as const;

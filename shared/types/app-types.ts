import type { boardNodeYellowTargets, candidatePriorities } from '../constants/app-constants';

/** ホロワーク優先モードの全選択肢を示す型 */
export type CandidatePriority = typeof candidatePriorities[number];

/** ホロメンボードの報酬アップ対象となる全アイテムを示す型 */
export type BoardNodeYellowTarget = typeof boardNodeYellowTargets[number];

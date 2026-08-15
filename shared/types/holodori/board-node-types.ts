import type { boardNodeYellowTargets } from '../../constants/app-constants';
import type { boardNodeCategories } from '../../constants/holodori-constants';

/** ホロメンボードマスの全カテゴリを示す型 */
export type BoardNodeCategory = typeof boardNodeCategories[number];

/** ホロメンボードの報酬アップ対象となる全アイテムを示す型 */
export type BoardNodeYellowTarget = typeof boardNodeYellowTargets[number];

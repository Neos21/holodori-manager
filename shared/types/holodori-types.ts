import type { boardNodeCategories } from '../constants/holodori-constants';

/** ホロメンボードマスの全カテゴリを示す型 */
export type BoardNodeCategory = typeof boardNodeCategories[number];

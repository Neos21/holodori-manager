import { blooms, rarities } from '../../constants/holodori-constants';

/** レア度の型 */
export type Rarity = (typeof rarities)[number];

/** 開花度の型 */
export type Bloom = (typeof blooms)[number];

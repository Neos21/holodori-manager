import { blooms, rarities } from '../../constants/holodori-constants';

/** カードのレア度を表す型 */
export type Rarity = (typeof rarities)[number];

/** カードの開花段階を表す型 */
export type Bloom = (typeof blooms)[number];

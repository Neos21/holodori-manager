export type Card = {
  id: number;
  holomems_id: number;
  rarity: 3 | 4 | 5;
  name: string;
  is_owned: 0 | 1;
  level: number;
  bloom: 0 | 1 | 2 | 3 | 4 | 5;
};

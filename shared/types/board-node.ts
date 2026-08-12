export type BoardNode = {
  id: number;
  holomems_id: number;
  category: 'red' | 'blue' | 'yellow' | 'green';
  yellow_target: 'lesson_pt' | 'cube' | 'training' | null;
  description: string;
  is_unlocked: 0 | 1;
  amount: number;
  connect_rate: number | null;
};

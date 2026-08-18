import type { BoardNodeCategory, BoardNodeYellowTarget } from '../../shared/types/holodori/board-node-types';

/** ホロメンボードのカテゴリ名 */
export const categoryNames: Record<BoardNodeCategory, string> = {
  yellow: '黄マス',
  green : '緑マス',
  red   : '赤マス',
  blue  : '青マス'
};

/** ホロメンボードで黄マス選択時の報酬アップ対象アイテム名 */
export const yellowTargetNames: Record<BoardNodeYellowTarget, string> = {
  cube     : 'キューブ',
  training : '特訓アイテム',
  lesson_pt: 'レッスン Pt'
};

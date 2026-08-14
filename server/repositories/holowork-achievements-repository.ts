import { buildUpdateQuery } from '../helpers/build-update-query';

import type { HoloworkAchievement } from '../../shared/types/holowork-achievement';

/** `holowork_achievements` テーブルの永続化操作 */
export class HoloworkAchievementsRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 達成状況を追加して採番 ID を返す */
  public async create(achievement: Partial<HoloworkAchievement>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO holowork_achievements (holomems_id, current_count, note) VALUES (?, ?, ?)')
      .bind(achievement.holomems_id, achievement.current_count, achievement.note)
      .run();
    return result.meta.last_row_id;
  }
  
  /** 指定された項目だけを更新する・更新項目がなければ SQL を実行しない */
  public async update(id: number, achievement: Partial<HoloworkAchievement>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'holomems_id'  , value: achievement.holomems_id   },
      { column: 'current_count', value: achievement.current_count },
      { column: 'note'         , value: achievement.note          }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE holowork_achievements SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

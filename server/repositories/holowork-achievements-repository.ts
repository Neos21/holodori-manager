import { buildUpdateQuery } from '../helpers/build-update-query';

import type { HoloworkAchievement } from '../../shared/types/entities/holowork-achievement';

/** `holowork_achievements` テーブルの永続化操作 */
export class HoloworkAchievementsRepository {
  constructor(private readonly db: D1Database) { }
  
  public async update(id: number, achievement: Partial<HoloworkAchievement>): Promise<void> {
    // ホロメン ID は編集不可とする
    const { sets, values } = buildUpdateQuery([
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

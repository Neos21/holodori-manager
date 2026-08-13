import { buildUpdateQuery } from '../helpers/build-update-query';

import type { HoloworkAchievement } from '../../shared/types/holowork-achievement';

export class HoloworkAchievementsRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<HoloworkAchievement>> {
    const result = await this.db
      .prepare('SELECT id, holomems_id, current_count, note FROM holowork_achievements ORDER BY id ASC')
      .all<HoloworkAchievement>();
    return result.results ?? [];
  }
  
  public async findById(id: number): Promise<HoloworkAchievement | null> {
    return await this.db
      .prepare('SELECT id, holomems_id, current_count, note FROM holowork_achievements WHERE id = ? LIMIT 1')
      .bind(id)
      .first<HoloworkAchievement>();
  }
  
  /** インクリメント対象の存在をチェックするために使用する */
  public async findByHolomemsId(holomems_id: number): Promise<HoloworkAchievement | null> {
    return await this.db
      .prepare('SELECT id, holomems_id, current_count, note FROM holowork_achievements WHERE holomems_id = ? LIMIT 1')
      .bind(holomems_id)
      .first<HoloworkAchievement>();
  }
  
  public async create(achievement: Partial<HoloworkAchievement>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO holowork_achievements (holomems_id, current_count, note) VALUES (?, ?, ?)')
      .bind(achievement.holomems_id, achievement.current_count, achievement.note)
      .run();
    return result.meta.last_row_id;
  }
  
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
  
  /** ホロワーク完了時に「ホロワーク完了回数」をインクリメントする */
  public async incrementCountByHolomemsId(holomems_id: number): Promise<void> {
    // 万が一インクリメント対象のホロメンデータがなければ新規追加とする
    const existing = await this.findByHolomemsId(holomems_id);
    if(existing == null) {
      await this.create({ holomems_id, current_count: 1 });  // `note` カラムは Null 許容している・`undefined` が渡った場合は自動的に Null が Bind されるため `note` プロパティは記載不要
      return;
    }
    
    await this.db
      .prepare('UPDATE holowork_achievements SET current_count = current_count + 1 WHERE holomems_id = ?')
      .bind(holomems_id)
      .run();
  }
}

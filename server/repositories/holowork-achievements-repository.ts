import { buildUpdateQuery } from '../helpers/update-query';

import type { HoloworkAchievement } from '../../shared/types/holowork-achievement';

export class HoloworkAchievementsRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<HoloworkAchievement>> {
    const result = await this.db
      .prepare('SELECT id, holomem_id AS holomems_id, current_count, note FROM holowork_achievements ORDER BY id ASC')
      .all<HoloworkAchievement>();
    return result.results ?? [];
  }
  
  public async findById(id: number): Promise<HoloworkAchievement | null> {
    return await this.db
      .prepare('SELECT id, holomem_id AS holomems_id, current_count, note FROM holowork_achievements WHERE id = ? LIMIT 1')
      .bind(id)
      .first<HoloworkAchievement>();
  }
  
  public async findByHolomemsId(holomems_id: number): Promise<HoloworkAchievement | null> {
    return await this.db
      .prepare('SELECT id, holomem_id AS holomems_id, current_count, note FROM holowork_achievements WHERE holomem_id = ? LIMIT 1')
      .bind(holomems_id)
      .first<HoloworkAchievement>();
  }
  
  public async create(achievement: Partial<HoloworkAchievement>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO holowork_achievements (holomem_id, current_count, note) VALUES (?, ?, ?)')
      .bind(achievement.holomems_id, achievement.current_count ?? 0, achievement.note ?? null)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, achievement: Partial<HoloworkAchievement>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'holomem_id', value: achievement.holomems_id },
      { column: 'current_count', value: achievement.current_count },
      { column: 'note', value: achievement.note, shouldInclude: (value: unknown): boolean => value !== undefined }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE holowork_achievements SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
  
  public async incrementCountByHolomemsId(holomems_id: number): Promise<void> {
    const existing = await this.findByHolomemsId(holomems_id);
    if(existing == null) {
      await this.create({ holomems_id, current_count: 1 });
      return;
    }
    
    await this.db
      .prepare('UPDATE holowork_achievements SET current_count = current_count + 1 WHERE holomem_id = ?')
      .bind(holomems_id)
      .run();
  }
}

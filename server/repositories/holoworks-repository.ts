import type { Holowork } from '../../shared/types/holowork';

export class HoloworksRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findById(id: number): Promise<Holowork | null> {
    return await this.db
      .prepare('SELECT id, name FROM holoworks WHERE id = ? LIMIT 1')
      .bind(id)
      .first<Holowork>();
  }
  
  public async create(holowork: Partial<Holowork>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO holoworks (name) VALUES (?)')
      .bind(holowork.name)
      .run();
    return result.meta.last_row_id;
  }
  
  /** ホロワーク1枠を削除する : 指定の枠で活動中のメンバーがいないことを `NOT EXISTS` で保証チェックする */
  public async delete(id: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM holoworks WHERE id = ? AND NOT EXISTS (SELECT 1 FROM active_holowork_members WHERE holoworks_id = ?)')
      .bind(id, id)
      .run();
    return result.meta.changes > 0;
  }
}

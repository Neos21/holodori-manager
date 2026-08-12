import type { Holowork } from '../../shared/types/holowork';

export class HoloworksRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<Holowork>> {
    const result = await this.db
      .prepare('SELECT id, name FROM holoworks ORDER BY id ASC')
      .all<Holowork>();
    return result.results ?? [];
  }
  
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
  
  public async delete(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM holoworks WHERE id = ?')
      .bind(id)
      .run();
  }
}

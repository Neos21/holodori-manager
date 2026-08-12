import type { Holomem } from '../../shared/types/holomem';

export class HolomemsRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<Holomem>> {
    const result = await this.db
      .prepare('SELECT id, sort_order, "group", name, note, is_active FROM holomems ORDER BY sort_order ASC, id ASC')
      .all<Holomem>();
    return result.results ?? [];
  }
  
  public async findById(id: number): Promise<Holomem | null> {
    return await this.db
      .prepare('SELECT id, sort_order, "group", name, note, is_active FROM holomems WHERE id = ? LIMIT 1')
      .bind(id)
      .first<Holomem>();
  }
  
  public async create(holomem: Partial<Holomem>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO holomems (sort_order, "group", name, note, is_active) VALUES (?, ?, ?, ?, ?)')
      .bind(holomem.sort_order, holomem.group, holomem.name, holomem.note ?? null, holomem.is_active)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, holomem: Partial<Holomem>): Promise<void> {
    const sets: Array<string> = [];
    const values: Array<unknown> = [];
    
    if(holomem.sort_order != null) {
      sets.push('sort_order = ?');
      values.push(holomem.sort_order);
    }
    
    if(holomem.group != null) {
      sets.push('"group" = ?');
      values.push(holomem.group);
    }
    
    if(holomem.name != null) {
      sets.push('name = ?');
      values.push(holomem.name);
    }
    
    if(holomem.note != null) {
      sets.push('note = ?');
      values.push(holomem.note);
    }
    
    if(holomem.is_active != null) {
      sets.push('is_active = ?');
      values.push(holomem.is_active);
    }
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE holomems SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

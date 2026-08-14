import { booleanNumberTrue } from '../../shared/constants/boolean-constants';
import { buildUpdateQuery } from '../helpers/build-update-query';

import type { Holomem } from '../../shared/types/holomem';

export class HolomemsRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<Holomem>> {
    // 「表示順」でソートし、万が一重複していた時のために念のため ID でのソート条件も書いておく
    const result = await this.db
      .prepare('SELECT id, sort_order, group_name, name, note, is_active FROM holomems ORDER BY sort_order ASC, id ASC')
      .all<Holomem>();
    return result.results ?? [];
  }
  
  public async findById(id: number): Promise<Holomem | null> {
    return await this.db
      .prepare('SELECT id, sort_order, group_name, name, note, is_active FROM holomems WHERE id = ? LIMIT 1')
      .bind(id)
      .first<Holomem>();
  }
  
  /** 指定した ID に一致する有効なホロメンを取得する */
  public async findActiveByIds(ids: Array<number>): Promise<Array<Holomem>> {
    if(ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const result = await this.db
      .prepare(`SELECT id, sort_order, group_name, name, note, is_active FROM holomems WHERE is_active = ${booleanNumberTrue} AND id IN (${placeholders}) ORDER BY id ASC`)
      .bind(...ids)
      .all<Holomem>();
    return result.results ?? [];
  }
  
  public async create(holomem: Partial<Holomem>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO holomems (sort_order, group_name, name, note, is_active) VALUES (?, ?, ?, ?, ?)')
      .bind(holomem.sort_order, holomem.group_name, holomem.name, holomem.note, holomem.is_active)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, holomem: Partial<Holomem>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'sort_order', value: holomem.sort_order },
      { column: 'group_name', value: holomem.group_name },
      { column: 'name'      , value: holomem.name       },
      { column: 'note'      , value: holomem.note       },
      { column: 'is_active' , value: holomem.is_active  }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE holomems SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

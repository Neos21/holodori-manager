import { buildUpdateQuery } from '../helpers/build-update-query';

import type { Holomem } from '../../shared/types/holomem';

export class HolomemsRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<Holomem>> {
    // 「表示順」でソートする
    // TODO : `sort_order` について、現状 DB 制約としては UNIQUE にしていないが、重複しては意味がないのでユニークとしたい
    // TODO : ただ、実際に UNIQUE 制約を入れてしまうと、表示順を入れ替える際の編集が煩雑になる可能性があるため、扱い方を考える
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
      .bind(holomem.sort_order, holomem.group, holomem.name, holomem.note, holomem.is_active)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, holomem: Partial<Holomem>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'sort_order', value: holomem.sort_order },
      { column: '"group"'   , value: holomem.group      },
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

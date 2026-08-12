import { buildUpdateQuery } from '../helpers/update-query';

import type { Memo } from '../../shared/types/memo';

export class MemoRepository {
  constructor(private readonly db: D1Database) { }
  
  public async find(): Promise<Memo | null> {
    return await this.db
      .prepare('SELECT id, content FROM memo LIMIT 1')
      .first<Memo>();
  }
  
  public async create(memo: Partial<Memo>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO memo (content) VALUES (?)')
      .bind(memo.content ?? null)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, memo: Partial<Memo>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'content', value: memo.content, shouldInclude: (value: unknown): boolean => value !== undefined }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE memo SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

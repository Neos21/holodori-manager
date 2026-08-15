import { buildUpdateQuery } from '../helpers/build-update-query';

import type { Memo } from '../../shared/types/entities/memo';

export class MemoRepository {
  constructor(private readonly db: D1Database) { }
  
  /** ID 未指定で1件取得する (`memo` テーブルは単一行で運用する想定のため) */
  public async findOne(): Promise<Memo | null> {
    return await this.db
      .prepare('SELECT id, content FROM memo LIMIT 1')
      .first<Memo>();
  }
  
  public async create(memo: Partial<Memo>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO memo (content) VALUES (?)')
      .bind(memo.content)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, memo: Partial<Memo>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'content', value: memo.content }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE memo SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

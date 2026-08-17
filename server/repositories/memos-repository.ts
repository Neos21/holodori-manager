import { buildUpdateQuery } from '../helpers/build-update-query';

import type { Memo } from '../../shared/types/entities/memo';

/** `memos` テーブルの永続化操作を扱う Repository */
export class MemosRepository {
  constructor(private readonly db: D1Database) { }
  
  /** メモを ID 昇順で一覧取得する */
  public async findAll(): Promise<Array<Memo>> {
    const result = await this.db
      .prepare('SELECT id, content FROM memos ORDER BY id ASC')
      .all<Memo>();
    return result.results ?? [];
  }
  
  /** メモを作成して、作成された ID を返す */
  public async create(memo: Partial<Memo>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO memos (content) VALUES (?)')
      .bind(memo.content ?? null)
      .run();
    return result.meta.last_row_id;
  }
  
  /** 対象メモの内容を更新する */
  public async update(id: number, memo: Partial<Memo>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'content', value: memo.content }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE memos SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
  
  /** 対象メモを削除する */
  public async delete(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM memos WHERE id = ?')
      .bind(id)
      .run();
  }
}

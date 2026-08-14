import type { Holowork } from '../../shared/types/holowork';

/** `holoworks` テーブルの永続化操作 */
export class HoloworksRepository {
  constructor(private readonly db: D1Database) { }
  
  /** ID が一致するホロワーク枠を取得する・存在しない場合は `null` */
  public async findById(id: number): Promise<Holowork | null> {
    return await this.db
      .prepare('SELECT id, name FROM holoworks WHERE id = ? LIMIT 1')
      .bind(id)
      .first<Holowork>();
  }
  
  /** ホロワーク枠を追加して採番 ID を返す */
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

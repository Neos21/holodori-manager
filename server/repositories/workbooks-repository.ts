import type { Workbook } from '../../shared/types/entities/workbook';

/** `workbooks` テーブルの永続化操作を扱う Repository */
export class WorkbooksRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 指定された ID のワークブックを取得する */
  public async findById(id: number): Promise<Workbook | null> {
    return await this.db
      .prepare('SELECT id, snapshot FROM workbooks WHERE id = ? LIMIT 1')
      .bind(id)
      .first<Workbook>();
  }
  
  /** 指定された ID のワークブックスナップショットを作成または置き換える (UPSERT 相当) */
  public async upsert(id: number, snapshot: string): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO workbooks (id, snapshot) VALUES (?, ?)
        ON CONFLICT (id) DO UPDATE SET snapshot = excluded.snapshot
      `)
      .bind(id, snapshot)
      .run();
  }
}

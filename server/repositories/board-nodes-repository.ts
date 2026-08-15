import { buildUpdateQuery } from '../helpers/build-update-query';

import type { BoardNode } from '../../shared/types/entities/board-node';

/** `board_nodes` テーブルの永続化操作を扱う Repository */
export class BoardNodesRepository {
  constructor(private readonly db: D1Database) { }
  
  /** ボードマスを ID 順で一覧取得する */
  public async findAll(): Promise<Array<BoardNode>> {
    const result = await this.db
      .prepare('SELECT id, holomems_id, category, yellow_target, description, is_unlocked, amount, connect_rate FROM board_nodes ORDER BY id ASC')
      .all<BoardNode>();
    return result.results ?? [];
  }
  
  /** ボードマスを作成して、作成された ID を返す */
  public async create(boardNode: Partial<BoardNode>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO board_nodes (holomems_id, category, yellow_target, description, is_unlocked, amount, connect_rate) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(boardNode.holomems_id, boardNode.category, boardNode.yellow_target, boardNode.description, boardNode.is_unlocked, boardNode.amount, boardNode.connect_rate)
      .run();
    return result.meta.last_row_id;
  }
  
  /** 対象ボードマスの変更可能な項目だけを更新する */
  public async update(id: number, boardNode: Partial<BoardNode>): Promise<void> {
    // ホロメン ID、カテゴリ、黄マス時の報酬アップ対象アイテムは編集を許可しないため含めない
    const { sets, values } = buildUpdateQuery([
      { column: 'description' , value: boardNode.description                                                                    },
      { column: 'is_unlocked' , value: boardNode.is_unlocked                                                                    },
      { column: 'amount'      , value: boardNode.amount                                                                         },
      { column: 'connect_rate', value: boardNode.connect_rate , shouldInclude: (value: unknown): boolean => value !== undefined }  // `null` を許容するため
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE board_nodes SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
  
  /** 対象ボードマスを削除する */
  public async delete(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM board_nodes WHERE id = ?')
      .bind(id)
      .run();
  }
}

import { buildUpdateQuery } from '../helpers/build-update-query';

import type { BoardNode } from '../../shared/types/board-node';

export class BoardNodesRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<BoardNode>> {
    const result = await this.db
      .prepare('SELECT id, holomems_id, category, yellow_target, description, is_unlocked, amount, connect_rate FROM board_nodes ORDER BY id ASC')
      .all<BoardNode>();
    return result.results ?? [];
  }
  
  public async create(boardNode: Partial<BoardNode>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO board_nodes (holomems_id, category, yellow_target, description, is_unlocked, amount, connect_rate) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(boardNode.holomems_id, boardNode.category, boardNode.yellow_target, boardNode.description, boardNode.is_unlocked, boardNode.amount, boardNode.connect_rate)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, boardNode: Partial<BoardNode>): Promise<void> {
    // ホロメン ID、カテゴリ、黃マス時の報酬アップ対象アイテムは編集を許可しないため含めない
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
  
  public async delete(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM board_nodes WHERE id = ?')
      .bind(id)
      .run();
  }
}

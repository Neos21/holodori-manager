import { buildUpdateQuery } from '../helpers/build-update-query';

import type { BoardNode } from '../../shared/types/board-node';

export class BoardNodesRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<BoardNode>> {
    // ホロメンボードのマスは黄 → 緑 → 赤 → 青の順にグルーピング・ソートして表示したいため CASE 文が入っている
    const result = await this.db
      .prepare(`
        SELECT id, holomems_id, category, yellow_target, description, is_unlocked, amount, connect_rate
        FROM board_nodes
        ORDER BY
          CASE category
            WHEN 'yellow' THEN 1
            WHEN 'green'  THEN 2
            WHEN 'red'    THEN 3
            WHEN 'blue'   THEN 4
          END ASC,
          id ASC
      `)
      .all<BoardNode>();
    return result.results ?? [];
  }
  
  // TODO : 現状未使用
  public async findById(id: number): Promise<BoardNode | null> {
    return await this.db
      .prepare('SELECT id, holomems_id, category, yellow_target, description, is_unlocked, amount, connect_rate FROM board_nodes WHERE id = ? LIMIT 1')
      .bind(id)
      .first<BoardNode>();
  }
  
  public async create(boardNode: Partial<BoardNode>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO board_nodes (holomems_id, category, yellow_target, description, is_unlocked, amount, connect_rate) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(boardNode.holomems_id, boardNode.category, boardNode.yellow_target, boardNode.description, boardNode.is_unlocked, boardNode.amount, boardNode.connect_rate)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, boardNode: Partial<BoardNode>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'holomems_id'  , value: boardNode.holomems_id                                                                    },
      { column: 'category'     , value: boardNode.category                                                                       },
      { column: 'yellow_target', value: boardNode.yellow_target, shouldInclude: (value: unknown): boolean => value !== undefined },  // `null` を許容するため
      { column: 'description'  , value: boardNode.description                                                                    },
      { column: 'is_unlocked'  , value: boardNode.is_unlocked                                                                    },
      { column: 'amount'       , value: boardNode.amount                                                                         },
      { column: 'connect_rate' , value: boardNode.connect_rate , shouldInclude: (value: unknown): boolean => value !== undefined }  // `null` を許容するため
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE board_nodes SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

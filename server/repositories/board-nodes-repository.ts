import { boardNodeCategories } from '../../shared/constants/holodori-constants';
import { buildUpdateQuery } from '../helpers/build-update-query';

import type { BoardNode, BoardNodeDisplay } from '../../shared/types/board-node';

export class BoardNodesRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<BoardNodeDisplay>> {
    // ホロメン情報も表示したいのでテーブル結合して BoardNodeDisplay を返す
    // ホロメンボードのマスは黄 → 緑 → 赤 → 青の順にグルーピング・ソートして表示する
    // TODO : `holomems.note` も画面で参照・編集可能にしたいので取得しているが、ノードごとに重複して持ってくる必要もなさそう…。画面上での扱い方も含めて後ほど再検討する
    const buildCategoryCase = (): string => {
      const clauses = boardNodeCategories.map((bardNodeCategory, index) => `WHEN '${bardNodeCategory}' THEN ${index + 1}`).join(' ');
      return `CASE category ${clauses} END ASC`;
    };
    const result = await this.db
      .prepare(`
        SELECT
          holomems.group AS holomem_group,
          holomems.name  AS holomem_name,
          holomems.note  AS holomem_note,
          
          board_nodes.id,
          board_nodes.holomems_id,
          board_nodes.category,
          board_nodes.yellow_target,
          board_nodes.description,
          board_nodes.is_unlocked,
          board_nodes.amount,
          board_nodes.connect_rate
        FROM board_nodes
        INNER JOIN holomems
          ON holomems.id = board_nodes.holomems_id
        ORDER BY
          holomems.sort_order ASC,
          holomems.id         ASC,
          ${buildCategoryCase()},
          board_nodes.id      ASC
      `)
      .all<BoardNodeDisplay>();
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

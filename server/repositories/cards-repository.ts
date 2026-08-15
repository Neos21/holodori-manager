import { buildUpdateQuery } from '../helpers/build-update-query';

import type { Card } from '../../shared/types/entities/card';

export class CardsRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<Card>> {
    const result = await this.db
      .prepare('SELECT id, holomems_id, rarity, name, is_owned, level, bloom FROM cards ORDER BY id ASC')
      .all<Card>();
    return result.results ?? [];
  }
  
  public async create(card: Partial<Card>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO cards (holomems_id, rarity, name, is_owned, level, bloom) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(card.holomems_id, card.rarity, card.name, card.is_owned, card.level, card.bloom)
      .run();
    return result.meta.last_row_id;
  }
  
  public async update(id: number, card: Partial<Card>): Promise<void> {
    // ホロメン ID、レア度など登録後に変更させたくない項目は含めない
    const { sets, values } = buildUpdateQuery([
      { column: 'name'    , value: card.name     },
      { column: 'is_owned', value: card.is_owned },
      { column: 'level'   , value: card.level    },
      { column: 'bloom'   , value: card.bloom    }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

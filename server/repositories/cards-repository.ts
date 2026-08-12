import { rarities } from '../../shared/constants/holodori-constants';
import { buildUpdateQuery } from '../helpers/update-query';

import type { Card, CardDisplay } from '../../shared/types/card';

export class CardsRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<CardDisplay>> {
    const result = await this.db
      .prepare(`
        SELECT
          cards.id,
          cards.holomems_id,
          holomems.name AS holomem_name,
          cards.rarity,
          cards.name,
          cards.is_owned,
          cards.level,
          cards.bloom
        FROM cards
        INNER JOIN holomems ON holomems.id = cards.holomems_id
        ORDER BY holomems.sort_order ASC, cards.rarity DESC, cards.id ASC
      `)
      .all<CardDisplay>();
    return result.results ?? [];
  }
  
  public async findById(id: number): Promise<CardDisplay | null> {
    return await this.db
      .prepare(`
        SELECT
          cards.id,
          cards.holomems_id,
          holomems.name AS holomem_name,
          cards.rarity,
          cards.name,
          cards.is_owned,
          cards.level,
          cards.bloom
        FROM cards
        INNER JOIN holomems ON holomems.id = cards.holomems_id
        WHERE cards.id = ?
        LIMIT 1
      `)
      .bind(id)
      .first<CardDisplay>();
  }
  
  public async create(card: Partial<Card>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO cards (holomems_id, rarity, name, is_owned, level, bloom) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(card.holomems_id, card.rarity, card.name, card.is_owned, card.level, card.bloom)
      .run();
    return result.meta.last_row_id;
  }
  
  public async createDefaultCards(holomemId: number): Promise<void> {
    const cardStatements = rarities.map(rarity => this.db
      .prepare('INSERT INTO cards (holomems_id, rarity, name, is_owned, level, bloom) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(holomemId, rarity, '通常版', 0, 1, 0));
    await this.db.batch(cardStatements);
  }
  
  public async update(id: number, card: Partial<Card>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'holomems_id', value: card.holomems_id },
      { column: 'rarity', value: card.rarity },
      { column: 'name', value: card.name },
      { column: 'is_owned', value: card.is_owned },
      { column: 'level', value: card.level },
      { column: 'bloom', value: card.bloom }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

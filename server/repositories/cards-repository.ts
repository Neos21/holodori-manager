import { booleanNumberFalse } from '../../shared/constants/boolean-constants';
import { bloom0, defaultCardLevel, rarities } from '../../shared/constants/holodori-constants';
import { buildUpdateQuery } from '../helpers/build-update-query';

import type { Card } from '../../shared/types/card';

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
  
  /** 新規ホロメン追加時に通常版の星3・4・5カードを自動追加するために使用する */
  public async createDefaultCards(holomemId: number): Promise<void> {
    const cardStatements = rarities.map(rarity => this.db
      .prepare('INSERT INTO cards (holomems_id, rarity, name, is_owned, level, bloom) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(holomemId, rarity, '通常版', booleanNumberFalse, defaultCardLevel, bloom0));
    await this.db.batch(cardStatements);
  }
  
  public async update(id: number, card: Partial<Card>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'holomems_id', value: card.holomems_id },
      { column: 'rarity'     , value: card.rarity      },
      { column: 'name'       , value: card.name        },
      { column: 'is_owned'   , value: card.is_owned    },
      { column: 'level'      , value: card.level       },
      { column: 'bloom'      , value: card.bloom       }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

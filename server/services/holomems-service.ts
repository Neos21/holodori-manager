import { CardsRepository } from '../repositories/cards-repository';
import { HolomemsRepository } from '../repositories/holomems-repository';

import type { Holomem } from '../../shared/types/holomem';

export class HolomemsService {
  constructor(private readonly db: D1Database) { }
  
  public async create(holomem: Partial<Holomem>): Promise<number> {
    const id = await new HolomemsRepository(this.db).create(holomem);
    if(Number.isNaN(id) || id <= 0) throw new Error('ホロメンの作成に失敗しました');
    
    await new CardsRepository(this.db).createDefaultCards(id);
    
    return id;
  }
}

import { CardsRepository } from '../repositories/cards-repository';
import { HolomemsRepository } from '../repositories/holomems-repository';

import type { Holomem } from '../../shared/types/holomem';

export class HolomemsService {
  constructor(private readonly db: D1Database) { }
  
  /** ホロメンを新規作成し、通常版カードを3種類合わせて作る */
  public async create(holomem: Partial<Holomem>): Promise<number> {
    const id = await new HolomemsRepository(this.db).create(holomem);
    await new CardsRepository(this.db).createDefaultCards(id);
    // TODO : holowork-achievements テーブルも「ホロワーク0回完了」で作るだけ作っとくべきだ
    return id;
  }
}

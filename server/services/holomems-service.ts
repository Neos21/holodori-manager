import { CardsRepository } from '../repositories/cards-repository';
import { HolomemsRepository } from '../repositories/holomems-repository';
import { HoloworkAchievementsRepository } from '../repositories/holowork-achievements-repository';

import type { Holomem } from '../../shared/types/holomem';

export class HolomemsService {
  constructor(private readonly db: D1Database) { }
  
  /** ホロメンを新規作成し、通常版カードを3種類合わせて作る */
  public async create(holomem: Partial<Holomem>): Promise<number> {
    const id = await new HolomemsRepository(this.db).create(holomem);
    // 通常版カード3種類を作る
    await new CardsRepository(this.db).createDefaultCards(id);
    // ホロワーク達成状況のレコードを作っておく
    await new HoloworkAchievementsRepository(this.db).create({ holomems_id: id, current_count: 0 });
    return id;
  }
}

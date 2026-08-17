import { booleanNumberFalse } from '../../shared/constants/boolean-constants';
import { bloom0, defaultCardLevel, rarities } from '../../shared/constants/holodori-constants';

import type { Holomem } from '../../shared/types/entities/holomem';

/** ホロメン作成に伴う関連レコードの初期化を扱うサービス */
export class HolomemsService {
  constructor(private readonly db: D1Database) { }
  
  /** ホロメンと、レア度ごとの通常版カード・ホロワーク達成状況を一括作成する */
  public async create(holomem: Partial<Holomem>): Promise<number> {
    const holomemStatement = this.db
      .prepare('INSERT INTO holomems (sort_order, group_name, name, note, is_active) VALUES (?, ?, ?, ?, ?)')
      .bind(holomem.sort_order, holomem.group_name, holomem.name, holomem.note, holomem.is_active);
    
    // 定義されているレア度ごとの通常版カードを作る
    const cardStatements = rarities.map(rarity => this.db
      .prepare('INSERT INTO cards (holomems_id, rarity, name, is_owned, level, bloom) SELECT seq, ?, ?, ?, ?, ? FROM sqlite_sequence WHERE name = \'holomems\'')
      .bind(rarity, '通常版', booleanNumberFalse, defaultCardLevel, bloom0));
    
    // ホロワーク達成状況のレコードを作っておく
    const achievementStatement = this.db
      .prepare('INSERT INTO holowork_achievements (holomems_id, current_count) SELECT seq, ? FROM sqlite_sequence WHERE name = \'holomems\'')
      .bind(0);
    
    // Batch は単一トランザクションとして実行される・先頭の `INSERT` で確定したホロメン ID を後続 SQL が `sqlite_sequence` から参照する
    const [holomemResult] = await this.db.batch([holomemStatement, ...cardStatements, achievementStatement]);
    return holomemResult.meta.last_row_id;
  }
}

import { booleanNumberTrue } from '../../shared/constants/boolean-constants';
import { buildUpdateQuery } from '../helpers/build-update-query';

import type { Holomem } from '../../shared/types/entities/holomem';

/** `holomems` テーブルの永続化操作を扱う Repository */
export class HolomemsRepository {
  constructor(private readonly db: D1Database) { }
  
  /** ホロメンを表示順、同順の場合は ID 順で一覧取得する */
  public async findAll(): Promise<Array<Holomem>> {
    // 「表示順」でソートし、万が一重複していた時のために念のため ID でのソート条件も書いておく
    const result = await this.db
      .prepare('SELECT id, sort_order, group_name, name, note, is_active FROM holomems ORDER BY sort_order ASC, id ASC')
      .all<Holomem>();
    return result.results ?? [];
  }
  
  /** ID が一致するホロメンを取得する・存在しない場合は `null` を返す */
  public async findById(id: number): Promise<Holomem | null> {
    return await this.db
      .prepare('SELECT id, sort_order, group_name, name, note, is_active FROM holomems WHERE id = ? LIMIT 1')
      .bind(id)
      .first<Holomem>();
  }
  
  /** 指定した ID に一致する有効なホロメンを ID 順で取得する */
  public async findActiveByIds(ids: Array<number>): Promise<Array<Holomem>> {
    if(ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const result = await this.db
      .prepare(`SELECT id, sort_order, group_name, name, note, is_active FROM holomems WHERE is_active = ${booleanNumberTrue} AND id IN (${placeholders}) ORDER BY id ASC`)
      .bind(...ids)
      .all<Holomem>();
    return result.results ?? [];
  }
  
  /** 対象ホロメンの変更可能な項目だけを更新する */
  public async update(id: number, holomem: Partial<Holomem>): Promise<void> {
    // ID 以外の全項目を編集可能とする
    const { sets, values } = buildUpdateQuery([
      { column: 'sort_order', value: holomem.sort_order },
      { column: 'group_name', value: holomem.group_name },
      { column: 'name'      , value: holomem.name       },
      { column: 'note'      , value: holomem.note       },
      { column: 'is_active' , value: holomem.is_active  }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE holomems SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

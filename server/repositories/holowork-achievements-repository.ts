import { buildUpdateQuery } from '../helpers/build-update-query';

import type { HoloworkAchievement } from '../../shared/types/holowork-achievement';

/** `holowork_achievements` テーブルの永続化操作 */
export class HoloworkAchievementsRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 全ホロメンの達成状況を ID 順で取得する */  // TODO : これを呼び出してるルーティングコントローラ自体が、画面から呼び出されないから未使用かも？
  public async findAll(): Promise<Array<HoloworkAchievement>> {
    const result = await this.db
      .prepare('SELECT id, holomems_id, current_count, note FROM holowork_achievements ORDER BY id ASC')
      .all<HoloworkAchievement>();
    return result.results ?? [];
  }
  
  /** ID が一致する達成状況を取得する・存在しない場合は `null` */  // TODO : 呼び出し箇所ないかも
  public async findById(id: number): Promise<HoloworkAchievement | null> {
    return await this.db
      .prepare('SELECT id, holomems_id, current_count, note FROM holowork_achievements WHERE id = ? LIMIT 1')
      .bind(id)
      .first<HoloworkAchievement>();
  }
  
  /** インクリメント対象の存在をチェックするために使用する */  // TODO : private でいいかも
  public async findByHolomemsId(holomems_id: number): Promise<HoloworkAchievement | null> {
    return await this.db
      .prepare('SELECT id, holomems_id, current_count, note FROM holowork_achievements WHERE holomems_id = ? LIMIT 1')
      .bind(holomems_id)
      .first<HoloworkAchievement>();
  }
  
  /** 達成状況を追加して採番 ID を返す */
  public async create(achievement: Partial<HoloworkAchievement>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO holowork_achievements (holomems_id, current_count, note) VALUES (?, ?, ?)')
      .bind(achievement.holomems_id, achievement.current_count, achievement.note)
      .run();
    return result.meta.last_row_id;
  }
  
  /** 指定された項目だけを更新する・更新項目がなければ SQL を実行しない */
  public async update(id: number, achievement: Partial<HoloworkAchievement>): Promise<void> {
    const { sets, values } = buildUpdateQuery([
      { column: 'holomems_id'  , value: achievement.holomems_id   },
      { column: 'current_count', value: achievement.current_count },
      { column: 'note'         , value: achievement.note          }
    ]);
    
    if(sets.length === 0) return;
    
    values.push(id);
    await this.db
      .prepare(`UPDATE holowork_achievements SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
  
  /** ホロワーク完了時に「ホロワーク完了回数」をインクリメントする */
  public async incrementCountByHolomemsId(holomems_id: number): Promise<void> {
    // 万が一インクリメント対象のホロメンデータがなければ新規追加とする
    const existing = await this.findByHolomemsId(holomems_id);
    if(existing == null) {
      await this.create({ holomems_id, current_count: 1, note: null });
      return;
    }
    
    await this.db
      .prepare('UPDATE holowork_achievements SET current_count = current_count + 1 WHERE holomems_id = ?')
      .bind(holomems_id)
      .run();
  }
}

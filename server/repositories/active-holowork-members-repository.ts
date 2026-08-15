import type { ActiveHoloworkMember } from '../../shared/types/entities/active-holowork-member';

/** `active_holowork_members` テーブルの永続化操作 */
export class ActiveHoloworkMembersRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 対象のホロワーク枠で活動中のホロメンが存在するか否かをチェックするために使用する */
  public async findByHoloworksId(holoworks_id: number): Promise<Array<ActiveHoloworkMember>> {
    const result = await this.db
      .prepare('SELECT id, holoworks_id, holomems_id FROM active_holowork_members WHERE holoworks_id = ? ORDER BY id ASC')
      .bind(holoworks_id)
      .all<ActiveHoloworkMember>();
    return result.results ?? [];
  }
  
  /** 指定したホロメンたちのうち、いずれかの枠で活動中のメンバーを取得する */
  public async findByHolomemsIds(holomemsIds: Array<number>): Promise<Array<ActiveHoloworkMember>> {
    if(holomemsIds.length === 0) return [];
    const placeholders = holomemsIds.map(() => '?').join(', ');
    const result = await this.db
      .prepare(`SELECT id, holoworks_id, holomems_id FROM active_holowork_members WHERE holomems_id IN (${placeholders}) ORDER BY id ASC`)
      .bind(...holomemsIds)
      .all<ActiveHoloworkMember>();
    return result.results ?? [];
  }
  
  /** 対象のホロワークで活動中のメンバーを一括解放する : ホロワーク完了 or 中断時に使用する */
  public async deleteByHoloworksId(holoworks_id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM active_holowork_members WHERE holoworks_id = ?')
      .bind(holoworks_id)
      .run();
  }
}

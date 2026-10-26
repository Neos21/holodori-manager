/** `active_holowork_members` テーブルの永続化操作を扱う Repository */
export class ActiveHoloworkMembersRepository {
  constructor(private readonly db: D1Database) { }
  
  /** ホロワーク完了または中断時に、指定した枠で活動中のメンバーを一括解放する */
  public async deleteByHoloworksId(holoworks_id: number): Promise<number> {
    const result = await this.db
      .prepare('DELETE FROM active_holowork_members WHERE holoworks_id = ?')
      .bind(holoworks_id)
      .run();
    return result.meta.changes;
  }
}

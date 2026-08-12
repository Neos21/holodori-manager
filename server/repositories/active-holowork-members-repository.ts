import type { ActiveHoloworkMember } from '../../shared/types/active-holowork-member';

export class ActiveHoloworkMembersRepository {
  constructor(private readonly db: D1Database) { }
  
  public async findAll(): Promise<Array<ActiveHoloworkMember>> {
    const result = await this.db
      .prepare('SELECT id, holoworks_id, holomem_id AS holomems_id FROM active_holowork_members ORDER BY holoworks_id ASC, id ASC')
      .all<ActiveHoloworkMember>();
    return result.results ?? [];
  }
  
  public async findByHoloworksId(holoworks_id: number): Promise<Array<ActiveHoloworkMember>> {
    const result = await this.db
      .prepare('SELECT id, holoworks_id, holomem_id AS holomems_id FROM active_holowork_members WHERE holoworks_id = ? ORDER BY id ASC')
      .bind(holoworks_id)
      .all<ActiveHoloworkMember>();
    return result.results ?? [];
  }
  
  public async findByHolomemsId(holomems_id: number): Promise<ActiveHoloworkMember | null> {
    return await this.db
      .prepare('SELECT id, holoworks_id, holomem_id AS holomems_id FROM active_holowork_members WHERE holomem_id = ? LIMIT 1')
      .bind(holomems_id)
      .first<ActiveHoloworkMember>();
  }
  
  public async create(member: Partial<ActiveHoloworkMember>): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO active_holowork_members (holoworks_id, holomem_id) VALUES (?, ?)')
      .bind(member.holoworks_id, member.holomems_id)
      .run();
    return result.meta.last_row_id;
  }
  
  public async deleteById(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM active_holowork_members WHERE id = ?')
      .bind(id)
      .run();
  }
  
  public async deleteByHoloworksId(holoworks_id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM active_holowork_members WHERE holoworks_id = ?')
      .bind(holoworks_id)
      .run();
  }
  
  public async deleteByHolomemsId(holomems_id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM active_holowork_members WHERE holomem_id = ?')
      .bind(holomems_id)
      .run();
  }
}

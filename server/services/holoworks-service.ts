import { httpStatusCode } from '../../shared/constants/http-status-code';
import { ActiveHoloworkMembersRepository } from '../repositories/active-holowork-members-repository';
import { HolomemsRepository } from '../repositories/holomems-repository';
import { HoloworksRepository } from '../repositories/holoworks-repository';

import type { Result } from '../../shared/types/result';

/** ホロワーク枠の操作を扱うサービス */
export class HoloworksService {
  constructor(private readonly db: D1Database) { }
  
  /** 対象枠で指定のホロメンの活動を開始する */
  public async start(holoworkId: number, holomemsIds: Array<number>): Promise<Result<Array<number>>> {
    const holoworkExistsResult = await this.ensureHoloworkExists(holoworkId);
    if(holoworkExistsResult.error != null) return holoworkExistsResult;
    
    const activeHoloworkMembersRepository = new ActiveHoloworkMembersRepository(this.db);
    
    const currentMembers = await activeHoloworkMembersRepository.findByHoloworksId(holoworkId);
    if(currentMembers.length > 0) return { error: '指定のホロワーク枠には活動中のメンバーがいます', httpStatusCode: httpStatusCode.badRequest };
    
    const activeHolomems = await new HolomemsRepository(this.db).findActiveByIds(holomemsIds);
    if(activeHolomems.length !== holomemsIds.length) return { error: '存在しない、または卒業済みのホロメンが含まれています', httpStatusCode: httpStatusCode.badRequest };
    
    const alreadyActiveMembers = await activeHoloworkMembersRepository.findByHolomemsIds(holomemsIds);
    if(alreadyActiveMembers.length > 0) return { error: '他枠で活動中のホロメンが含まれています', httpStatusCode: httpStatusCode.badRequest };
    
    const statements = holomemsIds.map(holomemsId => this.db
      .prepare('INSERT INTO active_holowork_members (holoworks_id, holomems_id) VALUES (?, ?)')
      .bind(holoworkId, holomemsId));
    try {
      const results = await this.db.batch(statements);
      return { result: results.map(result => result.meta.last_row_id) };
    }
    catch {
      return { error: '候補選択後に状態が変更されたため、ホロワークを開始できませんでした', httpStatusCode: httpStatusCode.badRequest };
    }
  }
  
  /** 対象枠を完了し、活動メンバーの完了回数を加算して解放する */
  public async complete(holoworkId: number): Promise<Result<Array<number>>> {
    const holoworkExistsResult = await this.ensureHoloworkExists(holoworkId);
    if(holoworkExistsResult.error != null) return holoworkExistsResult;
    
    const activeMembers = await new ActiveHoloworkMembersRepository(this.db).findByHoloworksId(holoworkId);
    if(activeMembers.length === 0) return { error: '活動中のメンバーが存在しません', httpStatusCode: httpStatusCode.badRequest };
    
    const holomemsIds = activeMembers.map(activeMember => activeMember.holomems_id);
    const statements = holomemsIds.map(holomemsId => this.db
      .prepare(`
        INSERT INTO holowork_achievements (holomems_id, current_count, note)
        VALUES (?, 1, NULL)
        ON CONFLICT(holomems_id) DO UPDATE SET current_count = current_count + 1
      `)
      .bind(holomemsId));
    statements.push(this.db.prepare('DELETE FROM active_holowork_members WHERE holoworks_id = ?').bind(holoworkId));
    await this.db.batch(statements);
    return { result: holomemsIds };
  }
  
  /** 対象枠を中断し、活動メンバーを回数加算せず解放する */
  public async abort(holoworkId: number): Promise<Result<void>> {
    const holoworkExistsResult = await this.ensureHoloworkExists(holoworkId);
    if(holoworkExistsResult.error != null) return holoworkExistsResult;
    
    const activeHoloworkMembersRepository = new ActiveHoloworkMembersRepository(this.db);
    
    const activeMembers = await activeHoloworkMembersRepository.findByHoloworksId(holoworkId);
    if(activeMembers.length === 0) return { error: '活動中のメンバーが存在しません', httpStatusCode: httpStatusCode.badRequest };
    
    await activeHoloworkMembersRepository.deleteByHoloworksId(holoworkId);
    return { result: undefined };
  }
  
  /** ホロワーク枠を削除する : 活動中メンバーがいないことを事前・事後確認する */
  public async delete(holoworkId: number): Promise<Result<void>> {
    const holoworkExistsResult = await this.ensureHoloworkExists(holoworkId);
    if(holoworkExistsResult.error != null) return holoworkExistsResult;
    
    const isDeleted = await new HoloworksRepository(this.db).delete(holoworkId);
    if(!isDeleted) return { error: '活動中のメンバーがいるため削除できません', httpStatusCode: httpStatusCode.badRequest };
    return { result: undefined };
  }
  
  /** 対象のホロワーク枠が存在することを確認する */
  private async ensureHoloworkExists(holoworkId: number): Promise<Result<void>> {
    const holowork = await new HoloworksRepository(this.db).findById(holoworkId);
    if(holowork == null) return { error: '指定のホロワークが見つかりません', httpStatusCode: httpStatusCode.notFound };
    return { result: undefined };
  }
}

import { minimumHoloworkMemberCount } from '../../shared/constants/holodori-constants';
import { httpStatusCode } from '../../shared/constants/http-status-code';
import { activeHoloworkMembersNotFoundErrorMessage } from '../constants/server-messages';
import { ActiveHoloworkMembersRepository } from '../repositories/active-holowork-members-repository';
import { HolomemsRepository } from '../repositories/holomems-repository';
import { HoloworksRepository } from '../repositories/holoworks-repository';

import type { HoloworkDisplay } from '../../shared/types/app/holowork-display';
import type { Result } from '../../shared/types/utilities/result';
import type { HoloworkDisplayRow } from '../types/holowork-display-row';

/** ホロワーク枠の表示モデル作成と操作を扱うサービス */
export class HoloworksService {
  constructor(private readonly db: D1Database) { }
  
  /** 活動中メンバーを含むホロワーク枠一覧を取得する */
  public async findAll(): Promise<Array<HoloworkDisplay>> {
    const sql = `
      SELECT
        holoworks.id        AS id,
        holoworks.name      AS name,
        holomems.id         AS holomems_id,
        holomems.sort_order AS holomems_sort_order,
        holomems.group_name AS holomems_group_name,
        holomems.name       AS holomems_name,
        holomems.note       AS holomems_note
      FROM holoworks
      LEFT JOIN active_holowork_members
        ON active_holowork_members.holoworks_id = holoworks.id
      LEFT JOIN holomems
        ON holomems.id = active_holowork_members.holomems_id
      ORDER BY
        holoworks.id        ASC,
        holomems.sort_order ASC,
        holomems.id         ASC
    `;
    const result = await this.db.prepare(sql).all<HoloworkDisplayRow>();
    
    // `LEFT JOIN` の1行を枠 ID ごとにまとめ、フロントエンド用モデルの `active_members` 配列に変換する
    const holoworks = new Map<number, HoloworkDisplay>();
    
    for(const row of result.results ?? []) {
      let holowork = holoworks.get(row.id);
      if(holowork == null) {
        holowork = { id: row.id, name: row.name, active_members: [] };
        holoworks.set(row.id, holowork);
      }
      
      // メンバーがいない枠も `LEFT JOIN` で1行返るため、Nullable なホロメン列は配列に追加しない
      if(row.holomems_id == null || row.holomems_sort_order == null || row.holomems_group_name == null || row.holomems_name == null) continue;
      
      holowork.active_members.push({
        holomems_id        : row.holomems_id,
        holomems_sort_order: row.holomems_sort_order,
        holomems_group_name: row.holomems_group_name,
        holomems_name      : row.holomems_name,
        holomems_note      : row.holomems_note  // ホロワーク枠一覧では表示してないけど型定義に合わせて拾っておく
      });
    }
    
    return [...holoworks.values()];
  }
  
  /** 対象枠で指定のホロメンの活動を開始する */
  public async start(holoworkId: number, holomemsIds: Array<number>): Promise<Result<Array<number>>> {
    // 候補取得後に状態が変わる可能性があるため、開始確定時にも枠・ホロメン・活動状況を順番に再検証する
    const holoworkExistsResult = await this.ensureHoloworkExists(holoworkId);
    if(holoworkExistsResult.error != null) return holoworkExistsResult;
    
    const activeHoloworkMembersRepository = new ActiveHoloworkMembersRepository(this.db);
    
    const currentMembers = await activeHoloworkMembersRepository.findByHoloworksId(holoworkId);
    if(currentMembers.length >= minimumHoloworkMemberCount) return { error: '指定のホロワーク枠には活動中のメンバーがいます', httpStatusCode: httpStatusCode.badRequest };
    
    const activeHolomems = await new HolomemsRepository(this.db).findActiveByIds(holomemsIds);
    if(activeHolomems.length !== holomemsIds.length) return { error: '存在しない、または卒業済みのホロメンが含まれています', httpStatusCode: httpStatusCode.badRequest };
    
    const alreadyActiveMembers = await activeHoloworkMembersRepository.findByHolomemsIds(holomemsIds);
    if(alreadyActiveMembers.length > 0) return { error: '他枠で活動中のホロメンが含まれています', httpStatusCode: httpStatusCode.badRequest };
    
    try {
      // 全メンバーの開始を一括実行し、一部のメンバーだけが活動中になる途中状態を残さない
      const statements = holomemsIds.map(holomemsId => this.db
        .prepare('INSERT INTO active_holowork_members (holoworks_id, holomems_id) VALUES (?, ?)')
        .bind(holoworkId, holomemsId));
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
    if(activeMembers.length < minimumHoloworkMemberCount) return { error: activeHoloworkMembersNotFoundErrorMessage, httpStatusCode: httpStatusCode.badRequest };
    
    // 各メンバーの回数加算と枠からの解放を同じ Batch に含め、完了処理を不可分にする
    // ホロワーク達成状況テーブルは念のため `UPSERT` 相当で実行しておく
    const holomemsIds = activeMembers.map(activeMember => activeMember.holomems_id);
    const statements = holomemsIds.map(holomemsId => this.db
      .prepare(`
        INSERT INTO holowork_achievements (holomems_id, current_count)
        VALUES (?, 1)
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
    if(activeMembers.length < minimumHoloworkMemberCount) return { error: activeHoloworkMembersNotFoundErrorMessage, httpStatusCode: httpStatusCode.badRequest };
    
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

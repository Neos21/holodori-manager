import { boardNodeYellowTargetCube, boardNodeYellowTargetLessonPt, boardNodeYellowTargetTraining } from '../../shared/constants/app-constants';
import { booleanNumberTrue } from '../../shared/constants/boolean-constants';
import { boardNodeCategoryYellow } from '../../shared/constants/holodori-constants';
import { BoardNodesService } from '../../shared/services/board-nodes-service';
import { HoloworkAchievementsService } from '../../shared/services/holowork-achievements-service';

import type { HoloworkMemberStatus } from '../../shared/types/holowork-member-status';
import type { HoloworkMemberStatusRow } from '../types/holowork-member-status-row';

/** ホロメン別のホロワーク達成状況・活動状況・黄マス情報を取得するサービス */
export class HoloworkMemberStatusesService {
  constructor(private readonly db: D1Database) { }
  
  /** 有効なホロメンのホロワーク達成状況・活動状況・黄マス情報を一覧で取得する */
  public async findAll(): Promise<Array<HoloworkMemberStatus>> {
    const rows = await this.findAllRows();
    // SQL は黃マス情報の行数だけ重複取得されるのでそれを統合する
    const statuses = new Map<number, HoloworkMemberStatus>();
    
    for(const row of rows) {
      let status = statuses.get(row.holomems_id);
      if(status == null) {
        const progress = HoloworkAchievementsService.calcProgress(row.current_count);
        status = {
          holomems_id             : row.holomems_id,
          holomems_sort_order     : row.holomems_sort_order,
          holomems_group_name     : row.holomems_group_name,
          holomems_name           : row.holomems_name,
          holowork_achievements_id: row.holowork_achievements_id,
          current_count           : row.current_count,
          next_threshold          : progress.next_threshold,
          remaining_count         : progress.remaining_count,
          achievement_note        : row.achievement_note,
          active_holoworks_id     : row.active_holoworks_id,
          active_holoworks_name   : row.active_holoworks_name,
          cube_total_rate         : 0,
          training_total_rate     : 0,
          lesson_pt_total_rate    : 0
        };
        statuses.set(row.holomems_id, status);
      }
      
      if(row.yellow_target == null || row.amount == null) continue;
      
      // 合計最終レートを加算していく
      const finalRate = BoardNodesService.calcFinalRate(row.amount, row.connect_rate);
      if(row.yellow_target === boardNodeYellowTargetCube    ) status.cube_total_rate      += finalRate;
      if(row.yellow_target === boardNodeYellowTargetTraining) status.training_total_rate  += finalRate;
      if(row.yellow_target === boardNodeYellowTargetLessonPt) status.lesson_pt_total_rate += finalRate;
    }
    
    // 表示順どおりに改めてソートして配列で返す
    return [...statuses.values()].sort((statusA, statusB) => statusA.holomems_sort_order - statusB.holomems_sort_order || statusA.holomems_id - statusB.holomems_id);
  }
  
  /** 画面用の複数テーブル JOIN 結果を取得する */
  private async findAllRows(): Promise<Array<HoloworkMemberStatusRow>> {
    const sql = `
      SELECT
        holomems.id                                      AS holomems_id,
        holomems.sort_order                              AS holomems_sort_order,
        holomems.group_name                              AS holomems_group_name,
        holomems.name                                    AS holomems_name,
        COALESCE(holowork_achievements.id, 0)            AS holowork_achievements_id,
        COALESCE(holowork_achievements.current_count, 0) AS current_count,
        holowork_achievements.note                       AS achievement_note,
        holoworks.id                                     AS active_holoworks_id,
        holoworks.name                                   AS active_holoworks_name,
        board_nodes.yellow_target                        AS yellow_target,
        board_nodes.amount                               AS amount,
        board_nodes.connect_rate                         AS connect_rate
      FROM holomems
      LEFT JOIN holowork_achievements
        ON holowork_achievements.holomems_id = holomems.id
      LEFT JOIN active_holowork_members
        ON active_holowork_members.holomems_id = holomems.id
      LEFT JOIN holoworks
        ON holoworks.id = active_holowork_members.holoworks_id
      LEFT JOIN board_nodes
        ON  board_nodes.holomems_id = holomems.id
        AND board_nodes.category = '${boardNodeCategoryYellow}'
        AND board_nodes.is_unlocked = ${booleanNumberTrue}
      WHERE holomems.is_active = ${booleanNumberTrue}
      ORDER BY
        holomems.sort_order ASC,
        holomems.id         ASC,
        board_nodes.id      ASC
    `;
    const result = await this.db.prepare(sql).all<HoloworkMemberStatusRow>();
    return result.results ?? [];
  }
}

import { candidatePriorityCount } from '../../shared/constants/app-constants';
import { holoworkAchievements } from '../../shared/constants/holodori-constants';

import type { CandidatePriority } from '../../shared/types/app-types';
import type { HoloworkCandidates, HoloworkCountCandidate, HoloworkRateCandidate } from '../../shared/types/holowork-candidate';

/** ホロワークで優先的に選択するべきホロメン候補を取得するためのサービス */
export class HoloworkCandidatesService {
  constructor(private readonly db: D1Database) { }
  
  /**
   * 優先すべきホロメン候補を優先度順に返す
   * 
   * Priority で `count` (完了回数重視) が選択された場合、次のアチーブメント達成までの残り回数が少ない順に取得する
   * アチーブメント最大回数を超えているホロメンは含まない
   * 
   * Priority で `lesson_pt`・`cube`・`training` のいずれか (アイテム獲得量重視) が選択された場合、
   * Priority と対応する `yellow_target` を見て「合計最終レート」が高いホロメンを順に取得する
   * 合計最終レートが 0% (効果なし) のホロメンは含まない
   *
   * いずれも、卒業等による無効化がされたホロメンは含まれない
   */
  public async getCandidates(holoworkId: number, priority: CandidatePriority): Promise<HoloworkCandidates> {
    if(priority === candidatePriorityCount) {
      return {
        selected_priority: priority,
        candidates       : await this.getCountCandidates(holoworkId)
      };
    }
    else {
      return {
        selected_priority: priority,
        candidates       : await this.getRateCandidates(holoworkId, priority)
      };
    }
  }
  
  /** 完了回数重視の場合の優先ホロメン候補を取得する */
  private async getCountCandidates(holoworkId: number): Promise<Array<HoloworkCountCandidate>> {
    // TODO : holomems.is_active = 0 なホロメンは除外すること・`400` がマジックナンバーとして登場しているので直す
    const sql = `
      SELECT
        holomems.id   AS holomems_id,
        holomems.name AS holomems_name,
        holomems.note AS holomems_note,
        
        COALESCE(holowork_achievements.current_count, 0) AS current_count,
        ${this.buildNextThresholdCase()}                 AS next_threshold,
        ${this.buildRemainingCountCase()}                AS remaining_count
      FROM holomems
      LEFT JOIN holowork_achievements
        ON holowork_achievements.holomems_id = holomems.id
      LEFT JOIN (SELECT holomems_id FROM active_holowork_members WHERE holoworks_id = ?) AS active_members
        ON active_members.holomems_id = holomems.id
      WHERE
          active_members.holomems_id IS NULL
      AND COALESCE(holowork_achievements.current_count, 0) < 400
      ORDER BY
        remaining_count ASC,
        next_threshold  ASC,
        holomems_id     ASC
    `;
    const result = await this.db.prepare(sql).bind(holoworkId).all<HoloworkCountCandidate>();
    return result.results ?? [];
  }
  
  /** 現在のホロワーク完了回数から見て直近のアチーブメントの値を返すカラムを組み立てる */
  private buildNextThresholdCase(): string {
    const clauses = holoworkAchievements.map(achievement => `WHEN COALESCE(holowork_achievements.current_count, 0) < ${achievement} THEN ${achievement}`).join(' ');
    return `CASE ${clauses} ELSE NULL END`;
  }
  
  /** 直近のアチーブメントに対する残り回数の値を返すカラムを組み立てる */
  private buildRemainingCountCase(): string {
    const clauses = holoworkAchievements.map(achievement => `WHEN COALESCE(holowork_achievements.current_count, 0) < ${achievement} THEN ${achievement} - COALESCE(holowork_achievements.current_count, 0)`).join(' ');
    return `CASE ${clauses} ELSE NULL END`;
  }
  
  /** アイテム獲得量重視の場合の優先ホロメン候補を取得する */
  private async getRateCandidates(holoworkId: number, priority: Exclude<CandidatePriority, typeof candidatePriorityCount>): Promise<Array<HoloworkRateCandidate>> {
    // 合計最終レートが 0% (効果なし) のホロメンは含まないよう HAVING 句で除外している
    // TODO : holomems.is_active = 0 なホロメンは除外すること
    const sql = `
      SELECT
        holomems.id   AS holomems_id,
        holomems.name AS holomems_name,
        holomems.note AS holomems_note,
        
        SUM(
          CASE WHEN board_nodes.yellow_target = ?
            THEN COALESCE(board_nodes.amount, 0) * (1 + COALESCE(board_nodes.connect_rate, 0) / 100.0)
            ELSE 0
          END
        ) AS total_rate
      FROM holomems
      LEFT JOIN board_nodes
        ON board_nodes.holomems_id = holomems.id
      LEFT JOIN (SELECT holomems_id FROM active_holowork_members WHERE holoworks_id = ?) AS active_members
        ON active_members.holomems_id = holomems.id
      WHERE
          active_members.holomems_id IS NULL
      GROUP BY holomems.id
      HAVING total_rate > 0
      ORDER BY
        total_rate  DESC,
        holomems_id ASC
    `;
    const result = await this.db.prepare(sql).bind(priority, holoworkId).all<HoloworkRateCandidate>();
    return result.results ?? [];
  }
}

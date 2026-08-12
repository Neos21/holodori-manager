import type { HoloworkCandidate, HoloworkCandidates } from '../../shared/types/holowork-candidate';

export const holoworkPriorities = ['count', 'lesson_pt', 'cube', 'training'] as const;

export type HoloworkPriority = (typeof holoworkPriorities)[number];

export const achievementThresholds = [1, 5, 10, 30, 50, 100, 200, 300, 400] as const;

export class HoloworkCandidatesService {
  constructor(private readonly db: D1Database) { }
  
  /**
   * ホロワーク候補を生成し、指定優先度と候補データを返す。
   *
   * - `count` : 次のアチーブメントまでの残り回数が少ない順
   * - `lesson_pt` / `cube` / `training` : 選択された yellow_target の合計最終レートが高い順
   *
   * `count` は achievement 集計のみ、その他は選択 priority に該当する board_nodes 集計のみを行います。
   */
  public async getCandidates(holoworkId: number, priority: HoloworkPriority): Promise<HoloworkCandidates> {
    if(priority === 'count') {
      return {
        selected_priority: priority,
        candidates: await this.getCountCandidates(holoworkId)
      };
    }
    else {
      return {
        selected_priority: priority,
        candidates: await this.getRateCandidates(holoworkId, priority)
      };
    }
  }
  
  private async getCountCandidates(holoworkId: number): Promise<Array<HoloworkCandidate>> {
    const sql = `
      SELECT
        holomems.id AS holomems_id,
        holomems.name AS holomems_name,
        holomems.note AS holomems_note,
        COALESCE(holowork_achievements.current_count, 0) AS current_count,
        ${this.buildNextThresholdCase('holowork_achievements.current_count')} AS next_threshold,
        ${this.buildRemainingCountCase('holowork_achievements.current_count')} AS remaining_count
      FROM holomems
      LEFT JOIN holowork_achievements ON holowork_achievements.holomems_id = holomems.id
      LEFT JOIN (
        SELECT holomems_id FROM active_holowork_members WHERE holoworks_id = ?
      ) AS active_members ON active_members.holomems_id = holomems.id
      WHERE active_members.holomems_id IS NULL
        AND COALESCE(holowork_achievements.current_count, 0) < 400
      ORDER BY remaining_count ASC, next_threshold ASC, holomems_id ASC
    `;
    
    const result = await this.db.prepare(sql).bind(holoworkId).all<Record<string, unknown>>();
    return (result.results ?? []).map((candidate: Record<string, unknown>) => ({
      holomems_id: candidate['holomems_id'] as number,
      holomems_name: candidate['holomems_name'] as string,
      holomems_note: (candidate['holomems_note'] as string) ?? null,
      current_count: candidate['current_count'] as number,
      next_threshold: candidate['next_threshold'] as number | null,
      remaining_count: candidate['remaining_count'] as number | null
    }));
  }
  
  private async getRateCandidates(holoworkId: number, priority: Exclude<HoloworkPriority, 'count'>): Promise<Array<HoloworkCandidate>> {
    const sql = `
      SELECT
        holomems.id AS holomems_id,
        holomems.name AS holomems_name,
        holomems.note AS holomems_note,
        SUM(
          CASE WHEN board_nodes.yellow_target = ?
            THEN COALESCE(board_nodes.amount, 0) * (1 + COALESCE(board_nodes.connect_rate, 0) / 100.0)
            ELSE 0
          END
        ) AS total_rate
      FROM holomems
      LEFT JOIN board_nodes ON board_nodes.holomems_id = holomems.id
      LEFT JOIN (
        SELECT holomems_id FROM active_holowork_members WHERE holoworks_id = ?
      ) AS active_members ON active_members.holomems_id = holomems.id
      WHERE active_members.holomems_id IS NULL
      GROUP BY holomems.id
      HAVING total_rate > 0
      ORDER BY total_rate DESC, holomems_id ASC
    `;
    
    const result = await this.db.prepare(sql).bind(priority, holoworkId).all<Record<string, unknown>>();
    return (result.results ?? []).map((candidate: Record<string, unknown>) => ({
      holomems_id: candidate['holomems_id'] as number,
      holomems_name: candidate['holomems_name'] as string,
      holomems_note: (candidate['holomems_note'] as string) ?? null,
      total_rate: candidate['total_rate'] as number
    }));
  }
  
  private buildNextThresholdCase(currentCountExpression: string): string {
    const clauses = achievementThresholds
      .map(threshold => `WHEN COALESCE(${currentCountExpression}, 0) < ${threshold} THEN ${threshold}`)
      .join(' ');
    return `CASE ${clauses} ELSE NULL END`;
  }
  
  private buildRemainingCountCase(currentCountExpression: string): string {
    const clauses = achievementThresholds
      .map(threshold => `WHEN COALESCE(${currentCountExpression}, 0) < ${threshold} THEN ${threshold} - COALESCE(${currentCountExpression}, 0)`)
      .join(' ');
    return `CASE ${clauses} ELSE NULL END`;
  }
}

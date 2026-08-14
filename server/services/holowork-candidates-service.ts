import { candidatePriorityCount } from '../../shared/constants/app-constants';
import { booleanNumberTrue } from '../../shared/constants/boolean-constants';
import { boardNodeCategoryYellow } from '../../shared/constants/holodori-constants';
import { BoardNodesService } from '../../shared/services/board-nodes-service';
import { HoloworkAchievementsService } from '../../shared/services/holowork-achievements-service';

import type { CandidatePriority } from '../../shared/types/app-types';
import type { HoloworkCandidate, HoloworkCandidates, HoloworkCountCandidate, HoloworkRateCandidate } from '../../shared/types/holowork-candidate';
import type { HoloworkCountCandidateRow, HoloworkRateCandidateRow } from '../types/holowork-candidate-row';

/** ホロワークで選択可能なホロメン候補を取得するためのサービス */
export class HoloworkCandidatesService {
  constructor(private readonly db: D1Database) { }
  
  /** 選択した優先モードに基づき、優先候補とその他候補を排他的に取得する */
  public async getCandidates(priority: CandidatePriority): Promise<HoloworkCandidates> {
    if(priority === candidatePriorityCount) return await this.getCountCandidates(priority);
    return await this.getRateCandidates(priority);
  }
  
  /** 完了回数重視の候補を取得する */
  private async getCountCandidates(priority: typeof candidatePriorityCount): Promise<HoloworkCandidates> {
    const rows = await this.findCountCandidateRows();
    
    // DB から得た現在回数に進捗計算結果を加え、クライアントへと返す完成済み候補モデルを作る
    const candidates = rows.map((row): HoloworkCountCandidate => {
      const progress = HoloworkAchievementsService.calcProgress(row.current_count);
      return {
        holomems_id        : row.holomems_id,
        holomems_sort_order: row.holomems_sort_order,
        holomems_group_name: row.holomems_group_name,
        holomems_name      : row.holomems_name,
        achievement_note   : row.achievement_note,
        current_count      : row.current_count,
        next_threshold     : progress.next_threshold,
        remaining_count    : progress.remaining_count
      };
    });
    
    // 少ない回数で到達できる候補を優先し、同じ残り回数ならより大きな閾値に近い現在回数の多い候補を優先する
    const priorityCandidates = candidates
      .filter(candidate => candidate.next_threshold != null)
      .sort((candidateA, candidateB) =>
        (candidateA.remaining_count ?? 0) - (candidateB.remaining_count ?? 0) ||
        candidateB.current_count - candidateA.current_count ||
        (candidateA.next_threshold ?? 0) - (candidateB.next_threshold ?? 0) ||
        this.compareHolomemOrder(candidateA, candidateB)
      );
    
    // 全達成済みの候補だけを差集合に残し、2つのレスポンス配列で同じ ID が重複しないようにする
    const priorityCandidateIds = new Set(priorityCandidates.map(candidate => candidate.holomems_id));
    const otherCandidates = candidates.filter(candidate => !priorityCandidateIds.has(candidate.holomems_id));
    this.sortByHolomemOrder(otherCandidates);
    
    return {
      selected_priority  : priority,
      priority_candidates: priorityCandidates,
      other_candidates   : otherCandidates
    };
  }
  
  /** アイテム獲得量重視の候補を取得する */
  private async getRateCandidates(priority: Exclude<CandidatePriority, typeof candidatePriorityCount>): Promise<HoloworkCandidates> {
    const rows = await this.findRateCandidateRows(priority);
    
    // SQL は対象の黄マス情報の行数だけ同じホロメンを返すため、ID ごとに合計レートを集約する
    const candidatesByHolomemsId = new Map<number, HoloworkRateCandidate>();
    
    for(const row of rows) {
      let candidate = candidatesByHolomemsId.get(row.holomems_id);
      if(candidate == null) {
        candidate = {
          holomems_id        : row.holomems_id,
          holomems_sort_order: row.holomems_sort_order,
          holomems_group_name: row.holomems_group_name,
          holomems_name      : row.holomems_name,
          achievement_note   : row.achievement_note,
          total_rate         : 0
        };
        candidatesByHolomemsId.set(row.holomems_id, candidate);
      }
      if(row.yellow_target == null || row.amount == null) continue;
      candidate.total_rate += BoardNodesService.calcFinalRate(row.amount, row.connect_rate);
    }
    
    const candidates = [...candidatesByHolomemsId.values()];
    
    // 効果量が正数の候補を合計レート降順で優先し、同率の場合だけ通常のホロメン表示順を使用する
    const priorityCandidates = candidates
      .filter(candidate => candidate.total_rate > 0)
      .sort((candidateA, candidateB) => candidateB.total_rate - candidateA.total_rate || this.compareHolomemOrder(candidateA, candidateB));
    
    // 効果量が0以下の候補だけを差集合に残し、優先候補との重複を構造的に防ぐ
    const priorityCandidateIds = new Set(priorityCandidates.map(candidate => candidate.holomems_id));
    const otherCandidates = candidates.filter(candidate => !priorityCandidateIds.has(candidate.holomems_id));
    this.sortByHolomemOrder(otherCandidates);
    
    return {
      selected_priority  : priority,
      priority_candidates: priorityCandidates,
      other_candidates   : otherCandidates
    };
  }
  
  /** 完了回数重視に必要な候補情報だけを取得する */
  private async findCountCandidateRows(): Promise<Array<HoloworkCountCandidateRow>> {
    const sql = `
      SELECT
        holomems.id                                      AS holomems_id,
        holomems.sort_order                              AS holomems_sort_order,
        holomems.group_name                              AS holomems_group_name,
        holomems.name                                    AS holomems_name,
        holowork_achievements.note                       AS achievement_note,
        COALESCE(holowork_achievements.current_count, 0) AS current_count
      FROM holomems
      LEFT JOIN holowork_achievements
        ON holowork_achievements.holomems_id = holomems.id
      LEFT JOIN active_holowork_members
        ON active_holowork_members.holomems_id = holomems.id
      WHERE
          active_holowork_members.holomems_id IS NULL
      AND holomems.is_active = ${booleanNumberTrue}
      ORDER BY
        holomems.sort_order ASC,
        holomems.id         ASC
    `;
    const result = await this.db.prepare(sql).all<HoloworkCountCandidateRow>();
    return result.results ?? [];
  }
  
  /** 選択したアイテムに該当する解放済み黄マスと候補情報だけを取得する */
  private async findRateCandidateRows(priority: Exclude<CandidatePriority, typeof candidatePriorityCount>): Promise<Array<HoloworkRateCandidateRow>> {
    const sql = `
      SELECT
        holomems.id                AS holomems_id,
        holomems.sort_order        AS holomems_sort_order,
        holomems.group_name        AS holomems_group_name,
        holomems.name              AS holomems_name,
        holowork_achievements.note AS achievement_note,
        board_nodes.yellow_target  AS yellow_target,
        board_nodes.amount         AS amount,
        board_nodes.connect_rate   AS connect_rate
      FROM holomems
      LEFT JOIN holowork_achievements
        ON holowork_achievements.holomems_id = holomems.id
      LEFT JOIN active_holowork_members
        ON active_holowork_members.holomems_id = holomems.id
      LEFT JOIN board_nodes
        ON  board_nodes.holomems_id = holomems.id
        AND board_nodes.category = '${boardNodeCategoryYellow}'
        AND board_nodes.is_unlocked = ${booleanNumberTrue}
        AND board_nodes.yellow_target = ?
      WHERE
          active_holowork_members.holomems_id IS NULL
      AND holomems.is_active = ${booleanNumberTrue}
      ORDER BY
        holomems.sort_order ASC,
        holomems.id         ASC,
        board_nodes.id      ASC
    `;
    const result = await this.db.prepare(sql).bind(priority).all<HoloworkRateCandidateRow>();
    return result.results ?? [];
  }
  
  /** ホロメン表示順と ID を比較する */
  private compareHolomemOrder(candidateA: HoloworkCandidate, candidateB: HoloworkCandidate): number {
    return candidateA.holomems_sort_order - candidateB.holomems_sort_order || candidateA.holomems_id - candidateB.holomems_id;
  }
  
  /** ホロメン表示順と ID で並べ替える */
  private sortByHolomemOrder(candidates: Array<HoloworkCandidate>): void {
    candidates.sort((candidateA, candidateB) => this.compareHolomemOrder(candidateA, candidateB));
  }
}

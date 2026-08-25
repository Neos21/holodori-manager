import { booleanNumberTrue } from '../constants/boolean-constants';
import { boardNodeCategoryYellow } from '../constants/holodori-constants';

import type { BoardNode } from '../types/entities/board-node';
import type { BoardNodeYellowTarget } from '../types/holodori/board-node-types';

/** ホロメンボードのマス効果を計算するサービス */
export class BoardNodesService {
  /**
   * 基礎効果量とコネクトマスによる増幅率から最終レートを算出する
   * 
   * `connectRate` が `null` の場合は増幅せず、基礎効果量をそのまま返す
   */
  public static calcFinalRate(amount: number, connectRate: number | null): number {
    return amount * (1 + (connectRate ?? 0) / 100);
  }
  
  /** 解放済み黄マスのうち、指定した報酬アップ対象アイテムに対する合計最終レートを算出する */
  public static calcYellowTargetTotalRate(boardNodes: Array<BoardNode>, yellowTarget: BoardNodeYellowTarget): number {
    return boardNodes.reduce((totalRate, boardNode) => {
      if(boardNode.category !== boardNodeCategoryYellow || boardNode.is_unlocked !== booleanNumberTrue || boardNode.yellow_target !== yellowTarget) return totalRate;
      return totalRate + this.calcFinalRate(boardNode.amount, boardNode.connect_rate);
    }, 0);
  }
}

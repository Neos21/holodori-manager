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
}

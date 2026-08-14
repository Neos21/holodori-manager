/** ホロメンボードのマス効果を計算するサービス */
export class BoardNodesService {
  /** 基礎効果量とコネクトマスによる増幅率から最終レートを算出する */
  public static calcFinalRate(amount: number, connectRate: number | null): number {
    return amount * (1 + (connectRate ?? 0) / 100);
  }
}

/** 「たかい」「ひくい」それぞれの成功確率などの計算結果 */
export type DoubleUpProbabilities = {
  /** 「たかい」の成功確率 */
  higher: number;
  /** 「ひくい」の成功確率 */
  lower: number;
  /** 残りデッキ中、判定に使われない同ランクのカード枚数 (参考値) */
  sameRankRemaining: number;
};

/** ダブルアップを継続すべきか判断するための入力値 */
export type DoubleUpDecisionInput = {
  /** 現在確定していない、チャレンジ中の見込みコイン */
  currentCoins: number;
  /** 「たかい」「ひくい」のうち、確率が高い方を選んだ場合の成功確率 */
  bestSideProbability: number;
};

/** ダブルアップの推奨アクション (継続 or 辞退・確定) */
export type DoubleUpRecommendation = 'continue' | 'collect';

/** ダブルアップの継続・辞退判断の結果 */
export type DoubleUpDecision = {
  /** 推奨アクション */
  recommendation: DoubleUpRecommendation;
  /** 理由 */
  reason: string;
  /** 継続する場合の期待値 */
  expectedValueIfContinue: number;
};

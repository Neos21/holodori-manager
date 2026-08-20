// トランプカードの共通表現 (ポーカー側・ダブルアップ側の両方で使う)

/** カードのスート (マーク) */
export type Suit = 'spade' | 'heart' | 'diamond' | 'club';

/** 2〜10・J=11・Q=12・K=13・A=14 (A は最大値・2 への接続なし) */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

/** ジョーカーを含まない、通常のトランプ1枚を表す型 */
export type PlayingCard = {
  suit: Suit;
  rank: Rank;
};

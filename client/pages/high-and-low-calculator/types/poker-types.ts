import type { PlayingCard } from './playing-card-types';

/** ジョーカー1枚を表す型 (スート・ランクを持たない特殊カード) */
export type JokerCard = {
  suit: 'joker';
};

/** ポーカー側で扱うカード・通常カードかジョーカーのいずれか */
export type PokerCard = PlayingCard | JokerCard;

/** このゲームで成立しうる役の種類 */
export type HandCategory =
  | 'none'           // 不成立
  | 'onePair'        // ワンペア             : 同じ数字が2枚の組み合わせが1つ                    : ×0 (これ単体では不成立と同じ扱い)
  | 'twoPair'        // ツーペア             : 同じ数字が2枚の組み合わせが2つ                    : ×4 (= 50コインベットが200コインになる)
  | 'threeCard'      // スリーカード         : 同じ数字が3枚                                     : ×4
  | 'straight'       // ストレート           : 5枚のカードが連番で並ぶ (A から 2 は連番ではない) : ×8
  | 'flush'          // フラッシュ           : 5枚のカードのマークが同じ                         : ×14
  | 'fullHouse'      // フルハウス           : ワンペア + スリーカードの組み合わせ               : ×16
  | 'fourCard'       // フォーカード         : 同じ数字が4枚                                     : ×30
  | 'straightFlush'  // ストレートフラッシュ : ストレート + フラッシュの組み合わせ               : ×60
  | 'fiveCard'       // ファイブカード       : 同じ数字が4枚 + ジョーカー                        : ×140
  | 'royalFlush';    // ロイヤルフラッシュ   : ストレートフラッシュを 10・J・Q・K・A で完成      : ×200

/**
 * EV (Expected Value・期待値) 計算モード
 * 
 * `exact`    : 組合せ数に関わらず常に全列挙して厳密計算する (遅いが正確)
 * `shortcut` : 組合せ数が少ない保持パターンは厳密計算、多い場合はモンテカルロサンプリングで近似する
 */
export type CalculationMode = 'exact' | 'shortcut';

/** ある保持パターン (0〜5枚保持) を選んだ場合の期待値計算結果 */
export type HoldOption = {
  /** `bit i` が 1 なら、配られた手札の i 番目のカードを保持することを表す */
  holdMask: number;
  /** 保持したカードのインデックス一覧 */
  heldIndices: Array<number>;
  /** 捨てて交換する枚数 */
  discardCount: number;
  /** 期待獲得コイン (ベット × 期待倍率) */
  expectedValue: number;
  /** 期待倍率 (各役の成立確率 × 倍率 の合計) */
  expectedMultiplier: number;
  /** 各役が成立する確率の内訳 */
  categoryProbabilities: Partial<Record<HandCategory, number>>;
  /** この結果が全列挙 (`exact`) かサンプリング (`sampled`) によるものかを示す */
  resultType: 'exact' | 'sampled';
  /** 母数 (全列挙なら組合せ総数・サンプリングなら試行回数) */
  sampleSize: number;
};

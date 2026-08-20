import type { DoubleUpDecision, DoubleUpDecisionInput, DoubleUpProbabilities } from '../types/double-up-types';
import type { PlayingCard, Rank, Suit } from '../types/playing-card-types';

/** ダブルアップ部分 (成功確率の計算および継続・辞退の判断) をまとめたサービスクラス */
export class DoubleUpService {
  /** 存在する4種類のスート (ダブルアップはジョーカーを使わないため、以下の2つの定数だけで完結する) */
  private readonly allSuits: Array<Suit> = ['spade', 'heart', 'diamond', 'club'];
  
  /** 存在する13種類のランク (2〜10・J=11・Q=12・K=13・A=14) */
  private readonly allRanks: Array<Rank> = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  
  /** 1プレイの獲得コインがコレを超えた時点で、それ以上ダブルアップできなくなる */
  private readonly perPlayCap: number = 10_000;
  
  /**
   * 提示トランプカードに対する「たかい」「ひくい」それぞれの成功確率を計算する
   * 
   * 計算の考え方 :
   * 
   * 1. ジョーカーを含まない52枚のデッキから、これまでに登場した (提示された・めくられた) トランプカードを全て除いた「残りデッキ」を作る
   * 2. 残りデッキの中で、提示トランプカードよりランクが高いトランプカード・低いトランプカードの枚数をそれぞれ数える
   * 3. 同ランクのトランプカードは「たかい」「ひくい」どちらの判定にも使われず、再提示される仕様なので、確率の分母 (`decisivePlayingCardCount`) からは除外する
   *     - (A は最上位・2 は最下位なので、これらが提示された場合は必ずどちらかに決着がつく)
   */
  public calcProbabilities(shownPlayingCard: PlayingCard, seenPlayingCards: Array<PlayingCard>): DoubleUpProbabilities {
    /** ダブルアップで使用するジョーカーなしの完全なトランプカードデッキ */
    const plainPlayingCardDeck = this.buildPlainPlayingCardDeck();
    /** 完全なデッキから現在までの提示分を除外するためのトランプカードキー */
    const seenPlayingCardKeys = new Set([...seenPlayingCards, shownPlayingCard].map(seenPlayingCard => `${seenPlayingCard.suit}-${seenPlayingCard.rank}`));
    /** 次の1枚として出現しうる未提示のトランプカード */
    const remainingPlayingCards = plainPlayingCardDeck.filter(plainPlayingCard => !seenPlayingCardKeys.has(`${plainPlayingCard.suit}-${plainPlayingCard.rank}`));
    
    /** 提示ランクより高く「たかい」で成功するトランプカード枚数 */
    const higherPlayingCardCount = remainingPlayingCards.filter(remainingPlayingCard => remainingPlayingCard.rank > shownPlayingCard.rank).length;
    /** 提示ランクより低く「ひくい」で成功するトランプカード枚数 */
    const lowerPlayingCardCount  = remainingPlayingCards.filter(remainingPlayingCard => remainingPlayingCard.rank < shownPlayingCard.rank).length;
    /** どちらの成否にも含まれず再選択となる同ランクのトランプカード枚数 */
    const sameRankRemainingPlayingCardCount = remainingPlayingCards.filter(remainingPlayingCard => remainingPlayingCard.rank === shownPlayingCard.rank).length;
    
    /** 同ランクを除いた成功・失敗のいずれかが確定するトランプカード枚数 */
    const decisivePlayingCardCount = higherPlayingCardCount + lowerPlayingCardCount;
    
    return {
      higher: decisivePlayingCardCount === 0 ? 0 : higherPlayingCardCount / decisivePlayingCardCount,
      lower : decisivePlayingCardCount === 0 ? 0 : lowerPlayingCardCount  / decisivePlayingCardCount,
      sameRankRemainingPlayingCardCount
    };
  }
  
  /** 次の提示トランプカードが不明な時点で、各トランプカードに対して有利な側を選び続けた場合の平均成功確率を計算する */
  public calcExpectedBestSideProbability(seenPlayingCards: Array<PlayingCard>): number {
    /** 完全なデッキから現在までの提示分を除外するためのトランプカードキー */
    const seenPlayingCardKeys = new Set(seenPlayingCards.map(seenPlayingCard => `${seenPlayingCard.suit}-${seenPlayingCard.rank}`));
    /** 次回の提示候補となる全ての未提示トランプカード */
    const remainingPlayingCards = this.buildPlainPlayingCardDeck().filter(plainPlayingCard => !seenPlayingCardKeys.has(`${plainPlayingCard.suit}-${plainPlayingCard.rank}`));
    if(remainingPlayingCards.length === 0) return 0;
    
    /** 各提示候補で「たかい」「ひくい」の有利な側を選んだ成功確率の合計 */
    const totalBestSideProbability = remainingPlayingCards.reduce((accumulatedBestSideProbability, remainingPlayingCard) => {
      /** 現在のトランプカードが提示された場合の両予測の成功確率 */
      const doubleUpProbabilities = this.calcProbabilities(remainingPlayingCard, seenPlayingCards);
      return accumulatedBestSideProbability + Math.max(doubleUpProbabilities.higher, doubleUpProbabilities.lower);
    }, 0);
    return totalBestSideProbability / remainingPlayingCards.length;
  }
  
  /** 現在の獲得コインが1プレイのダブルアップ上限を超えているか否か */
  public isPerPlayCapExceeded(currentCoins: number): boolean {
    return currentCoins > this.perPlayCap;
  }
  
  /**
   * ダブルアップを継続すべきか辞退すべきかを判断する
   * 
   * 判断の考え方 (優先順位順) :
   * 
   * 1. すでにプレイ内上限 (1万枚超) に達している場合、ルール上それ以上ダブルアップできないため強制的に辞退扱い
   * 2. 成功確率が 50% 以下なら、期待値計算をするまでもなく継続は不利
   * 3. 以上に該当しなければ、「継続時の期待値 = 次のコイン額 × 成功確率」を現在の確定コインと比較し、期待値が上回る場合のみ継続を推奨する
   * 
   * 日次上限は新しいプレイを開始できるか否かだけに影響するため、この判断には含めない
   */
  public recommendAction(doubleUpDecisionInput: DoubleUpDecisionInput): DoubleUpDecision {
    const { currentCoins, bestSideProbability } = doubleUpDecisionInput;
    
    /** ダブルアップ成功時に獲得できるコイン */
    const nextCoinsIfSuccess = currentCoins * 2;
    /** 失敗時の0枚も含めた継続時の期待獲得コイン */
    const expectedValueIfContinue = nextCoinsIfSuccess * bestSideProbability;
    
    if(this.isPerPlayCapExceeded(currentCoins)) {
      return {
        recommendation: 'collect',
        reason: 'このプレイの上限 (1万枚超) に達しているため、これ以上ダブルアップできません',
        expectedValueIfContinue
      };
    }
    
    if(bestSideProbability <= .5) {
      return {
        recommendation: 'collect',
        reason: `成功確率が ${(bestSideProbability * 100).toFixed(1)}% と 50% 以下のため、期待値では継続が不利です`,
        expectedValueIfContinue
      };
    }
    
    if(expectedValueIfContinue <= currentCoins) {
      return {
        recommendation: 'collect',
        reason: '期待値で見ると、現在の確定コインの方が有利です',
        expectedValueIfContinue
      };
    }
    
    return {
      recommendation: 'continue',
      reason: `成功確率 ${(bestSideProbability * 100).toFixed(1)}%・継続時の期待値 ${expectedValueIfContinue.toFixed(0)} 枚 > 現在の ${currentCoins} 枚のため継続が有利です`,
      expectedValueIfContinue
    };
  }
  
  /** ジョーカーを含まない52枚のデッキを組み立てる (ダブルアップはジョーカーを使わない) */
  private buildPlainPlayingCardDeck(): Array<PlayingCard> {
    /** 4スートと13ランクの全組合せを格納するダブルアップ用デッキ */
    const playingCardDeck: Array<PlayingCard> = [];
    for(const suit of this.allSuits) {
      for(const rank of this.allRanks) {
        playingCardDeck.push({ suit, rank });
      }
    }
    return playingCardDeck;
  }
}

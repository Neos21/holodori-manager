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
   * 提示カードに対する「たかい」「ひくい」それぞれの成功確率を計算する
   * 
   * 計算の考え方 :
   * 
   * 1. ジョーカーを含まない52枚のデッキから、これまでに登場した (提示された・めくられた) カードを全て除いた「残りデッキ」を作る
   * 2. 残りデッキの中で、提示カードよりランクが高いカード・低いカードの枚数をそれぞれ数える
   * 3. 同ランクのカードは「たかい」「ひくい」どちらの判定にも使われず、再提示される仕様なので、確率の分母 (`decisiveCardCount`) からは除外する
   *     - (A は最上位・2 は最下位なので、これらが提示された場合は必ずどちらかに決着がつく)
   */
  public calcProbabilities(shownPlayingCard: PlayingCard, seenPlayingCards: Array<PlayingCard>): DoubleUpProbabilities {
    const plainDeck = this.buildPlainDeck();
    const seenPlayingCardKeys = new Set([...seenPlayingCards, shownPlayingCard].map(playingCard => `${playingCard.suit}-${playingCard.rank}`));
    const remainingPlayingCards = plainDeck.filter(playingCard => !seenPlayingCardKeys.has(`${playingCard.suit}-${playingCard.rank}`));
    
    const higherCardCount   = remainingPlayingCards.filter(playingCard => playingCard.rank >   shownPlayingCard.rank).length;
    const lowerCardCount    = remainingPlayingCards.filter(playingCard => playingCard.rank <   shownPlayingCard.rank).length;
    const sameRankRemaining = remainingPlayingCards.filter(playingCard => playingCard.rank === shownPlayingCard.rank).length;
    
    const decisiveCardCount = higherCardCount + lowerCardCount;
    
    return {
      higher: decisiveCardCount === 0 ? 0 : higherCardCount / decisiveCardCount,
      lower : decisiveCardCount === 0 ? 0 : lowerCardCount  / decisiveCardCount,
      sameRankRemaining
    };
  }
  
  /** 次の提示カードが不明な時点で、各カードに対して有利な側を選び続けた場合の平均成功確率を計算する */
  public calcExpectedBestSideProbability(seenPlayingCards: Array<PlayingCard>): number {
    const seenPlayingCardKeys = new Set(seenPlayingCards.map(playingCard => `${playingCard.suit}-${playingCard.rank}`));
    const remainingPlayingCards = this.buildPlainDeck().filter(playingCard => !seenPlayingCardKeys.has(`${playingCard.suit}-${playingCard.rank}`));
    if(remainingPlayingCards.length === 0) return 0;
    
    const totalBestSideProbability = remainingPlayingCards.reduce((totalProbability, shownPlayingCard) => {
      const probabilities = this.calcProbabilities(shownPlayingCard, seenPlayingCards);
      return totalProbability + Math.max(probabilities.higher, probabilities.lower);
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
    const nextCoinsIfSuccess = currentCoins * 2;
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
  private buildPlainDeck(): Array<PlayingCard> {
    const deck: Array<PlayingCard> = [];
    for(const suit of this.allSuits) {
      for(const rank of this.allRanks) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  }
}

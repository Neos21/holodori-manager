import type { PlayingCard, Rank, Suit } from '../types/playing-card-types';
import type { CalculationMode, PokerCard, HandCategory, HoldOption, JokerCard } from '../types/poker-types';

/** ドローポーカー部分 (役判定・保持カード選択の EV 計算) をまとめたサービスクラス */
export class PokerService {
  /** 存在する4種類のスート */
  private readonly allSuits: Array<Suit> = ['spade', 'heart', 'diamond', 'club'];
  
  /** 存在する13種類のランク (2〜10・J=11・Q=12・K=13・A=14) */
  private readonly allRanks: Array<Rank> = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  
  /** 役の強さの順序 (数値が大きいほど強い役)・ジョーカー代入時に最善役を選ぶ際に使う */
  private readonly handOrder: Record<HandCategory, number> = {
    none         :  0,
    onePair      :  1,
    twoPair      :  2,
    threeCard    :  3,
    straight     :  4,
    flush        :  5,
    fullHouse    :  6,
    fourCard     :  7,
    straightFlush:  8,
    fiveCard     :  9,
    royalFlush   : 10
  };
  
  /** 役ごとの倍率・実際の獲得コインは `this.bet` × この倍率 */
  private readonly payoutTable: Record<HandCategory, number> = {
    none         :   0,
    onePair      :   0,
    twoPair      :   4,
    threeCard    :   4,
    straight     :   8,
    flush        :  14,
    fullHouse    :  16,
    fourCard     :  30,
    straightFlush:  60,
    fiveCard     : 140,
    royalFlush   : 200
  };
  
  /** 1プレイあたりの固定ベット枚数 */
  private readonly bet: number = 50;
  
  /** この組合せ数以下なら全列挙による厳密計算を行う (超えたらサンプリングに切り替える) */
  private readonly exactCombinationThreshold: number = 20_000;
  
  /** `shortcut` モードでサンプリングする場合のデフォルト試行回数 */
  private readonly defaultSampleSize: number = 50_000;
  
  /**
   * ジョーカーを含まない5枚 (実カードのみ) の役を判定する
   * 
   * 判定の考え方 :
   * 
   * 1. ランクを昇順に並べ、同じランクが何枚あるか (`rankCounts`) を数える
   *     - (例 : ツーペアなら降順で [2, 2, 1] のような分布になる)
   * 2. スートが全て同じかどうか (`isFlush`) を調べる
   * 3. ランクが5つの連番になっているかどうか (`isStraight`) を調べる
   *     - このゲームでは「A は最大値のみ・2 には接続しない」ルールなので、ランクを 2〜14 の単純な連番として比較するだけでこの仕様を満たす (「A・2・3・4・5」のような並びは `uniqueRanks` の差が 4 にならないため弾かれる)
   * 4. 強い役から順に条件を確認していき、最初に一致した役を返す
   */
  public evaluatePlainHand(playingCards: Array<PlayingCard>): HandCategory {
    if(playingCards.length !== 5) throw new Error(`実カードの役の判定には5枚必要です (${playingCards.length}枚選択されています)`);
    
    const sortedRanks = playingCards.map(playingCard => playingCard.rank).sort((rankA, rankB) => rankA - rankB);
    const suits = playingCards.map(playingCard => playingCard.suit);
    const isFlush = suits.every(suit => suit === suits[0]);
    
    // ランクごとの出現回数を数える
    const playingCardCountByRank = new Map<Rank, number>();
    for(const rank of sortedRanks) playingCardCountByRank.set(rank, (playingCardCountByRank.get(rank) ?? 0) + 1);
    const rankCounts = [...playingCardCountByRank.values()].sort((countA, countB) => countB - countA);
    
    // 5枚のランクが全て異なり、かつ最大と最小の差がちょうど 4 であれば連番 (ストレート)
    const uniqueRanks = [...new Set(sortedRanks)];
    const isStraight = uniqueRanks.length === 5 && uniqueRanks[4] - uniqueRanks[0] === 4;
    
    if(isStraight && isFlush) {
      const isRoyal = uniqueRanks[0] === 10 && uniqueRanks[4] === 14;
      return isRoyal ? 'royalFlush' : 'straightFlush';
    }
    if(rankCounts[0] === 4) return 'fourCard';
    if(rankCounts[0] === 3 && rankCounts[1] === 2) return 'fullHouse';
    if(isFlush) return 'flush';
    if(isStraight) return 'straight';
    if(rankCounts[0] === 3) return 'threeCard';
    if(rankCounts[0] === 2 && rankCounts[1] === 2) return 'twoPair';
    if(rankCounts[0] === 2) return 'onePair';
    return 'none';
  }
  
  /**
   * 実カード4枚 + ジョーカー1枚の最善役を判定する
   * 
   * 判定の考え方 :
   * 
   * 1. 実カード4枚が全て同じランクなら、ジョーカーを5枚目の同ランクカードとして使うのが確実に最善なので、無条件で「ファイブカード」を返す
   *     - 同ランク4枚では他にこれより強い役は成立し得ないため、代入探索は不要
   * 2. それ以外の場合は、ジョーカーに代入しうる全カード (既に手札にあるカードを除く) を1枚ずつ試し、5枚の役を判定した上で、最も強い役になる代入を採用する
   *     - (最大52通り前後の総当たりなので計算コストは小さい)
   */
  public evaluateHandWithJoker(realPlayingCards: Array<PlayingCard>): HandCategory {
    if(realPlayingCards.length !== 4) throw new Error(`ジョーカーを含む役の判定には実カードの指定が4枚必要です (${realPlayingCards.length}枚選択されています)`);
    
    const playingCardCountByRank = new Map<Rank, number>();
    for(const realPlayingCard of realPlayingCards) playingCardCountByRank.set(realPlayingCard.rank, (playingCardCountByRank.get(realPlayingCard.rank) ?? 0) + 1);
    
    if([...playingCardCountByRank.values()].some(count => count === 4)) return 'fiveCard';
    
    const excludedPlayingCardKeys = new Set(realPlayingCards.map(realPlayingCard => `${realPlayingCard.suit}-${realPlayingCard.rank}`));
    let bestCategory: HandCategory = 'none';
    let bestOrder = -1;
    
    for(const suit of this.allSuits) {
      for(const rank of this.allRanks) {
        const candidateKey = `${suit}-${rank}`;
        if(excludedPlayingCardKeys.has(candidateKey)) continue;  // 既出カードとの重複は出現しない
        const candidateCategory = this.evaluatePlainHand([...realPlayingCards, { suit, rank }]);
        const candidateOrder = this.handOrder[candidateCategory];
        if(candidateOrder > bestOrder) {
          bestOrder = candidateOrder;
          bestCategory = candidateCategory;
        }
      }
    }
    return bestCategory;
  }
  
  /** 5枚 (ジョーカーが混じっていてもよい) から最善役を判定するエントリポイント */
  public evaluateHand(pokerCards: Array<PokerCard>): HandCategory {
    if(pokerCards.length !== 5) throw new Error(`役の判定には5枚必要です (${pokerCards.length}枚選択されています)`);
    
    const jokerPlayingCards = pokerCards.filter(pokerCard => this.isJoker(pokerCard));
    const realPlayingCards  = pokerCards.filter((pokerCard): pokerCard is PlayingCard => !this.isJoker(pokerCard));
    
    if(jokerPlayingCards.length === 0) return this.evaluatePlainHand(realPlayingCards);
    if(jokerPlayingCards.length === 1) return this.evaluateHandWithJoker(realPlayingCards);
    throw new Error('このゲームのデッキにジョーカーは1枚のみのはずです');
  }
  
  /** 成立役に対応する獲得コインを返す */
  public calculatePayout(handCategory: HandCategory): number {
    return this.bet * this.payoutTable[handCategory];
  }
  
  /**
   * 配られた5枚に対して、32通りの保持パターン (0〜5枚保持) 全ての EV を計算する
   * 
   * - `mode : 'shortcut'` (デフォルト) : 組合せ数が少ない (捨て0〜3枚程度) 場合は全列挙による厳密計算、多い (捨て4〜5枚) 場合はモンテカルロサンプリングによる近似計算を自動的に使い分ける
   * - `mode : 'exact'`                 : 組合せ数に関わらず常に全列挙する (遅いが正確・検証用途向け)
   * 
   * @returns `expectedValue` (期待獲得コイン) の降順にソートして返す
   */
  public evaluateAllHoldOptions(dealtHand: Array<PokerCard>, options?: { mode?: CalculationMode; sampleSize?: number }): Array<HoldOption> {
    if(dealtHand.length !== 5) throw new Error(`カードは5枚である必要があります (${dealtHand.length}枚選択されています)`);
    
    const mode = options?.mode ?? 'shortcut';
    const sampleSize = options?.sampleSize ?? this.defaultSampleSize;
    
    const remainingDeck = this.buildRemainingDeck(dealtHand);
    const holdOptions: Array<HoldOption> = [];
    
    // 5枚それぞれを保持する or しないの2択なので、2^5 = 32通りをビットマスクで全て試す
    for(let holdMask = 0; holdMask < 32; holdMask++) {
      const heldIndices: Array<number> = [];
      const heldCards: Array<PokerCard> = [];
      for(let playingCardIndex = 0; playingCardIndex < 5; playingCardIndex++) {
        if(holdMask & (1 << playingCardIndex)) {
          heldIndices.push(playingCardIndex);
          heldCards.push(dealtHand[playingCardIndex]);
        }
      }
      const discardCount = 5 - heldCards.length;
      const possibleCombinationCount = this.countCombinations(remainingDeck.length, discardCount);
      
      // 組合せ数が閾値以下、または厳密モード指定時は全列挙・それ以外はサンプリングとする
      const shouldUseExactEnumeration = mode === 'exact' || possibleCombinationCount <= this.exactCombinationThreshold;
      
      const tallyResult = shouldUseExactEnumeration
        ? this.tallyByExactEnumeration(heldCards, remainingDeck, discardCount)
        : this.tallyBySampling(heldCards, remainingDeck, discardCount, sampleSize);
      
      // 役ごとの出現回数から、確率と期待倍率 (期待コインの元になる値) を計算する
      let expectedMultiplier = 0;
      const categoryProbabilities: Partial<Record<HandCategory, number>> = {};
      for(const [category, count] of Object.entries(tallyResult.categoryCounts)) {
        const probability = count / tallyResult.totalTrials;
        categoryProbabilities[category as HandCategory] = probability;
        expectedMultiplier += probability * this.payoutTable[category as HandCategory];
      }
      
      holdOptions.push({
        holdMask,
        heldIndices,
        discardCount,
        expectedValue: expectedMultiplier * this.bet,
        expectedMultiplier,
        categoryProbabilities,
        resultType: tallyResult.resultType,
        sampleSize: tallyResult.totalTrials
      });
    }
    
    return holdOptions.sort((optionA, optionB) => optionB.expectedValue - optionA.expectedValue);
  }
  
  /** 最も EV が高い保持パターンだけを返すショートカット */
  public recommendBestHold(dealtHand: Array<PokerCard>, options?: { mode?: CalculationMode; sampleSize?: number }): HoldOption {
    return this.evaluateAllHoldOptions(dealtHand, options)[0];
  }
  
  /** カードがジョーカーか否かを判定する型ガード */
  private isJoker(pokerCard: PokerCard): pokerCard is JokerCard {
    return pokerCard.suit === 'joker';
  }
  
  /** カードを一意に識別する文字列キーを作る (Set での重複判定に使う) */
  private playingCardKey(pokerCard: PokerCard): string {
    return this.isJoker(pokerCard) ? 'joker' : `${pokerCard.suit}-${pokerCard.rank}`;
  }
  
  /** 52枚 + ジョーカー1枚の完全なデッキを組み立てる */
  private buildFullDeck(): Array<PokerCard> {
    const deck: Array<PokerCard> = [];
    for(const suit of this.allSuits) {
      for(const rank of this.allRanks) {
        deck.push({ suit, rank });
      }
    }
    deck.push({ suit: 'joker' });
    return deck;
  }
  
  /**
   * 配られた5枚を除いた残りデッキを作る
   * 
   * このゲームは「配られた5枚 (保持・非保持を問わず) と同じカードは差し替え後も出現しない」仕様なので、5枚まるごと除外すればよい
   */
  private buildRemainingDeck(dealtHand: Array<PokerCard>): Array<PokerCard> {
    const dealtPlayingCardKeys = new Set(dealtHand.map(pokerCard => this.playingCardKey(pokerCard)));
    return this.buildFullDeck().filter(pokerCard => !dealtPlayingCardKeys.has(this.playingCardKey(pokerCard)));
  }
  
  /**
   * nCk (n 個から k 個選ぶ組合せの数) を、実際に組合せを列挙せずに計算する
   * 
   * これを使って「全列挙すると何通りになるか」を事前に見積もり、厳密計算とサンプリングのどちらを使うかを判断する
   */
  private countCombinations(totalCount: number, chooseCount: number): number {
    if(chooseCount < 0 || chooseCount > totalCount) return 0;
    const effectiveChooseCount = Math.min(chooseCount, totalCount - chooseCount);
    let combinationCount = 1;
    for(let step = 0; step < effectiveChooseCount; step++) combinationCount = (combinationCount * (totalCount - step)) / (step + 1);
    return Math.round(combinationCount);
  }
  
  /**
   * `items` から `chooseCount` 個選ぶ組合せを、重複なく順番に列挙するジェネレータ
   * 
   * 選ばれている要素のインデックス配列を1つずつ次の組合せに更新していく、典型的な「辞書順で次の組合せを求める」アルゴリズム
   */
  private *generateCombinations<TItem>(items: Array<TItem>, chooseCount: number): Generator<Array<TItem>> {
    const itemCount = items.length;
    if(chooseCount === 0) {
      yield [];
      return;
    }
    if(chooseCount > itemCount) return;
    
    // 最初の組合せは常に先頭 `chooseCount` 個 (インデックス 0・1・2・…)
    const selectedIndices = Array.from({ length: chooseCount }, (_, index) => index);
    while(true) {
      yield selectedIndices.map(index => items[index]);
      
      // 右端から「まだ繰り上げられるインデックス」を探す
      let pointer = chooseCount - 1;
      while(pointer >= 0 && selectedIndices[pointer] === itemCount - chooseCount + pointer) pointer--;
      if(pointer < 0) return;  // これ以上繰り上げられない = 全ての組合せを列挙し終えた
      
      // 見つけたインデックスを1つ進め、それより右側を詰め直す
      selectedIndices[pointer]++;
      for(let refillIndex = pointer + 1; refillIndex < chooseCount; refillIndex++) {
        selectedIndices[refillIndex] = selectedIndices[refillIndex - 1] + 1;
      }
    }
  }
  
  /**
   * 保持カード + 残りデッキから `discardCount` 枚を選ぶ全組合せを実際に列挙し、それぞれの役を判定して、役ごとの出現回数を正確に数え上げる
   * 
   * 組合せ数が少ない場合のみ使う想定 (厳密だが組合せ数に比例して遅い)
   */
  private tallyByExactEnumeration(heldCards: Array<PokerCard>, remainingDeck: Array<PokerCard>, discardCount: number): { categoryCounts: Partial<Record<HandCategory, number>>; totalTrials: number; resultType: 'exact' } {
    const categoryCounts: Partial<Record<HandCategory, number>> = {};
    let totalTrials = 0;
    
    for(const drawnCards of this.generateCombinations(remainingDeck, discardCount)) {
      const category = this.evaluateHand([...heldCards, ...drawnCards]);
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      totalTrials++;
    }
    
    return { categoryCounts, totalTrials, resultType: 'exact' };
  }
  
  /**
   * モンテカルロサンプリングにより、役ごとの出現回数を近似的に数え上げる
   * 
   * 組合せ数が膨大 (捨て4〜5枚) な場合に、全列挙の代わりに使う
   * 
   * 毎試行、残りデッキ (`shufflePool`) の先頭 `discardCount` 枚を Fisher-Yates の部分シャッフルでランダムに入れ替えることで
   * 重複なくランダムな `discardCount` 枚を高速に取り出す (デッキ配列自体は使い回し、コピーしない)
   */
  private tallyBySampling(heldCards: Array<PokerCard>, remainingDeck: Array<PokerCard>, discardCount: number, sampleSize: number): { categoryCounts: Partial<Record<HandCategory, number>>; totalTrials: number; resultType: 'sampled' } {
    const categoryCounts: Partial<Record<HandCategory, number>> = {};
    const shufflePool = remainingDeck.slice();
    
    for(let trialIndex = 0; trialIndex < sampleSize; trialIndex++) {
      // 部分シャッフル : 先頭から `discardCount` 個分だけ、ランダムな要素と入れ替えていく
      for(let position = 0; position < discardCount; position++) {
        const swapIndex = position + Math.floor(Math.random() * (shufflePool.length - position));
        [shufflePool[position], shufflePool[swapIndex]] = [shufflePool[swapIndex], shufflePool[position]];
      }
      const drawnCards = shufflePool.slice(0, discardCount);
      const category = this.evaluateHand([...heldCards, ...drawnCards]);
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }
    
    return { categoryCounts, totalTrials: sampleSize, resultType: 'sampled' };
  }
}

import type { PlayingCard, Rank, Suit } from '../types/playing-card-types';
import type { HandCategory, HoldCalculationOptions, HoldOption, JokerPlayingCard, PokerPlayingCard } from '../types/poker-types';

/** 1つの保持パターンを全列挙またはサンプリングした集計結果 */
type HandCategoryTally = {
  /** 役別の成立回数・一度も成立しなかった役はプロパティを持たない */
  handCategoryCounts: Partial<Record<HandCategory, number>>;
  /** 確率計算の分母となる全列挙の組合せ数またはサンプリング試行回数 */
  totalTrialCount: number;
  /** 集計に使用した計算方法 */
  resultType: 'exact' | 'sampled';
};

/** ドローポーカー部分 (役判定・保持カード選択の EV 計算) をまとめたサービスクラス */
export class PokerService {
  /** 存在する4種類のスート */
  private readonly allSuits: Array<Suit> = ['spade', 'heart', 'diamond', 'club'];
  
  /** 存在する13種類のランク (2〜10・J=11・Q=12・K=13・A=14) */
  private readonly allRanks: Array<Rank> = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  
  /** 役の強さの順序 (数値が大きいほど強い役)・ジョーカー代入時に最善役を選ぶ際に使う */
  private readonly handCategoryOrder: Record<HandCategory, number> = {
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
  private readonly payoutMultiplierByHandCategory: Record<HandCategory, number> = {
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
   * ジョーカーを含まない通常のトランプカード5枚の役を判定する
   * 
   * 判定の考え方 :
   * 
   * 1. ランクを昇順に並べ、同じランクが何枚あるか (`playingCardCounts`) を数える
   *     - (例 : ツーペアなら降順で [2, 2, 1] のような分布になる)
   * 2. スートが全て同じか否か (`isFlush`) を調べる
   * 3. ランクが5つの連番になっているか否か (`isStraight`) を調べる
   *     - このゲームでは「A は最大値のみ・2 には接続しない」ルールなので、ランクを 2〜14 の単純な連番として比較するだけでこの仕様を満たす (「A・2・3・4・5」のような並びは `uniquePlayingCardRanks` の差が 4 にならないため弾かれる)
   * 4. 強い役から順に条件を確認していき、最初に一致した役を返す
   */
  public evaluatePlainHand(playingCards: Array<PlayingCard>): HandCategory {
    if(playingCards.length !== 5) throw new Error(`通常のトランプカードの役判定には5枚必要です (${playingCards.length}枚選択されています)`);
    
    /** ストレート判定で最小・最大ランクを比較するために昇順に並べたランク */
    const sortedPlayingCardRanks = playingCards.map(playingCard => playingCard.rank).sort((playingCardRankA, playingCardRankB) => playingCardRankA - playingCardRankB);
    /** フラッシュ判定で全てが同一か比較するスート */
    const playingCardSuits = playingCards.map(playingCard => playingCard.suit);
    /** 5枚全てのスートが同一でフラッシュが成立するか否か */
    const isFlush = playingCardSuits.every(playingCardSuit => playingCardSuit === playingCardSuits[0]);
    
    /** ペア系の役を判定するためのランク別トランプカード枚数 */
    const playingCardCountByRank = new Map<Rank, number>();
    for(const playingCardRank of sortedPlayingCardRanks) playingCardCountByRank.set(playingCardRank, (playingCardCountByRank.get(playingCardRank) ?? 0) + 1);
    /** 最多枚数からペア・スリーカード・フォーカードを判定するため降順に並べたランク別枚数 */
    const playingCardCounts = [...playingCardCountByRank.values()].sort((playingCardCountA, playingCardCountB) => playingCardCountB - playingCardCountA);
    
    /** ストレート判定で重複ランクを除外した昇順のランク */
    const uniquePlayingCardRanks = [...new Set(sortedPlayingCardRanks)];
    /** 5枚のランクが全て異なり、最大と最小の差が4でストレートが成立するか否か */
    const isStraight = uniquePlayingCardRanks.length === 5 && uniquePlayingCardRanks[4] - uniquePlayingCardRanks[0] === 4;
    
    if(isStraight && isFlush) {
      /** ストレートフラッシュのランク範囲が 10〜A でロイヤルフラッシュになるか否か */
      const isRoyalFlush = uniquePlayingCardRanks[0] === 10 && uniquePlayingCardRanks[4] === 14;
      return isRoyalFlush ? 'royalFlush' : 'straightFlush';
    }
    if(playingCardCounts[0] === 4) return 'fourCard';
    if(playingCardCounts[0] === 3 && playingCardCounts[1] === 2) return 'fullHouse';
    if(isFlush) return 'flush';
    if(isStraight) return 'straight';
    if(playingCardCounts[0] === 3) return 'threeCard';
    if(playingCardCounts[0] === 2 && playingCardCounts[1] === 2) return 'twoPair';
    if(playingCardCounts[0] === 2) return 'onePair';
    return 'none';
  }
  
  /**
   * 通常のトランプカード4枚 + ジョーカー1枚の最善役を判定する
   * 
   * 判定の考え方 :
   * 
   * 1. 通常のトランプカード4枚が全て同じランクなら、ジョーカーを5枚目の同ランクトランプカードとして使うのが確実に最善なので、無条件で「ファイブカード」を返す
   *     - 同ランク4枚では他にこれより強い役は成立し得ないため、代入探索は不要
   * 2. それ以外の場合は、ジョーカーに代入しうる全トランプカード (既に手札にあるトランプカードを除く) を1枚ずつ試し、5枚の役を判定した上で、最も強い役になる代入を採用する
   *     - (最大52通り前後の総当たりなので計算コストは小さい)
   */
  public evaluateHandWithJoker(plainPlayingCards: Array<PlayingCard>): HandCategory {
    if(plainPlayingCards.length !== 4) throw new Error(`ジョーカーを含む役の判定には通常のトランプカードの指定が4枚必要です (${plainPlayingCards.length}枚選択されています)`);
    
    /** 通常のトランプカード4枚が同一ランクでファイブカードになるか判定するためのランク別枚数 */
    const playingCardCountByRank = new Map<Rank, number>();
    for(const plainPlayingCard of plainPlayingCards) playingCardCountByRank.set(plainPlayingCard.rank, (playingCardCountByRank.get(plainPlayingCard.rank) ?? 0) + 1);
    
    if([...playingCardCountByRank.values()].some(count => count === 4)) return 'fiveCard';
    
    /** ジョーカーの代入候補から実在しない重複を除くための手札キー */
    const excludedPlayingCardKeys = new Set(plainPlayingCards.map(plainPlayingCard => `${plainPlayingCard.suit}-${plainPlayingCard.rank}`));
    /** ジョーカーに各トランプカードを代入した中で最も強い役 */
    let bestHandCategory: HandCategory = 'none';
    /** 現在の最善役の強さ・最初の候補を必ず採用するため初期値は役なし未満 */
    let bestHandOrder = -1;
    
    for(const suit of this.allSuits) {
      for(const rank of this.allRanks) {
        /** ジョーカーに代入するトランプカードを手札との重複判定に使用するキー */
        const candidatePlayingCardKey = `${suit}-${rank}`;
        if(excludedPlayingCardKeys.has(candidatePlayingCardKey)) continue;  // 既出のトランプカードとの重複は出現しない
        /** 現在の代入候補によって成立する役 */
        const candidateHandCategory = this.evaluatePlainHand([...plainPlayingCards, { suit, rank }]);
        /** 現在の代入候補によって成立する役の強さ */
        const candidateHandOrder = this.handCategoryOrder[candidateHandCategory];
        if(candidateHandOrder > bestHandOrder) {
          bestHandOrder = candidateHandOrder;
          bestHandCategory = candidateHandCategory;
        }
      }
    }
    return bestHandCategory;
  }
  
  /** 5枚 (ジョーカーが混じっていてもよい) から最善役を判定するエントリポイント */
  public evaluateHand(pokerPlayingCards: Array<PokerPlayingCard>): HandCategory {
    if(pokerPlayingCards.length !== 5) throw new Error(`役の判定には5枚必要です (${pokerPlayingCards.length}枚選択されています)`);
    
    /** ジョーカーが2枚以上含まれる不正な手札を検出するために抽出したジョーカー */
    const jokerPlayingCards = pokerPlayingCards.filter(pokerPlayingCard => this.isJokerPlayingCard(pokerPlayingCard));
    /** ジョーカーの有無に応じた役判定に渡す通常のトランプカード */
    const plainPlayingCards = pokerPlayingCards.filter((pokerPlayingCard): pokerPlayingCard is PlayingCard => !this.isJokerPlayingCard(pokerPlayingCard));
    
    if(jokerPlayingCards.length === 0) return this.evaluatePlainHand(plainPlayingCards);
    if(jokerPlayingCards.length === 1) return this.evaluateHandWithJoker(plainPlayingCards);
    throw new Error('このゲームのデッキにジョーカーは1枚のみのはずです');
  }
  
  /** 成立役に対応する獲得コインを返す */
  public calculatePayout(handCategory: HandCategory): number {
    return this.bet * this.payoutMultiplierByHandCategory[handCategory];
  }
  
  /**
   * 配られた5枚に対して、32通りの保持パターン (0〜5枚保持) 全ての EV を計算する
   * 
   * - `mode : 'shortcut'` (デフォルト) : 組合せ数が少ない (捨て0〜3枚程度) 場合は全列挙による厳密計算、多い (捨て4〜5枚) 場合はモンテカルロサンプリングによる近似計算を自動的に使い分ける
   * - `mode : 'exact'`                 : 組合せ数に関わらず常に全列挙する (遅いが正確・検証用途向け)
   * 
   * @returns `expectedValue` (期待獲得コイン) の降順にソートして返す
   */
  public evaluateAllHoldOptions(dealtPokerPlayingCards: Array<PokerPlayingCard>, holdCalculationOptions?: HoldCalculationOptions): Array<HoldOption> {
    if(dealtPokerPlayingCards.length !== 5) throw new Error(`トランプカードは5枚である必要があります (${dealtPokerPlayingCards.length}枚選択されています)`);
    
    /** 呼出元で未指定の場合に既定値を補った計算モード */
    const calculationMode = holdCalculationOptions?.mode ?? 'shortcut';
    /** サンプリングに切り替わった保持パターンに使用する試行回数 */
    const sampleSize = holdCalculationOptions?.sampleSize ?? this.defaultSampleSize;
    
    /** 最初に配られた5枚を除外した交換候補のトランプカードデッキ */
    const remainingPokerPlayingCardDeck = this.buildRemainingPokerPlayingCardDeck(dealtPokerPlayingCards);
    /** 32通りそれぞれの期待値計算結果 */
    const holdOptions: Array<HoldOption> = [];
    
    // 5枚それぞれを保持する or しないの2択なので、2^5 = 32通りをビットマスクで全て試す
    for(let holdMask = 0; holdMask < 32; holdMask++) {
      /** このビットマスクで保持する交換前のトランプカード位置 */
      const heldPlayingCardIndices: Array<number> = [];
      /** このビットマスクで保持するトランプカード */
      const heldPokerPlayingCards: Array<PokerPlayingCard> = [];
      for(let playingCardIndex = 0; playingCardIndex < 5; playingCardIndex++) {
        if(holdMask & (1 << playingCardIndex)) {
          heldPlayingCardIndices.push(playingCardIndex);
          heldPokerPlayingCards.push(dealtPokerPlayingCards[playingCardIndex]);
        }
      }
      /** 保持しないため山札から交換するトランプカード枚数 */
      const discardCount = 5 - heldPokerPlayingCards.length;
      /** 現在の交換枚数で残りデッキから引きうる全組合せ数 */
      const possibleCombinationCount = this.countCombinations(remainingPokerPlayingCardDeck.length, discardCount);
      
      /** 厳密モード、または組合せ数が閾値以内で全列挙を使用するか否か */
      const shouldUseExactEnumeration = calculationMode === 'exact' || possibleCombinationCount <= this.exactCombinationThreshold;
      
      /** 現在の保持パターンで成立した役ごとの回数と試行総数 */
      const tallyResult = shouldUseExactEnumeration
        ? this.tallyByExactEnumeration(heldPokerPlayingCards, remainingPokerPlayingCardDeck, discardCount)
        : this.tallyBySampling(heldPokerPlayingCards, remainingPokerPlayingCardDeck, discardCount, sampleSize);
      
      /** 役ごとの成立確率と配当倍率を合算した現在の保持パターンの期待倍率 */
      let expectedMultiplier = 0;
      /** 現在の保持パターンで各役が成立する確率 */
      const handCategoryProbabilities: Partial<Record<HandCategory, number>> = {};
      for(const [handCategory, handCategoryCount] of Object.entries(tallyResult.handCategoryCounts)) {
        /** 集計した全試行に対して現在の役が成立した割合 */
        const handCategoryProbability = handCategoryCount / tallyResult.totalTrialCount;
        handCategoryProbabilities[handCategory as HandCategory] = handCategoryProbability;
        expectedMultiplier += handCategoryProbability * this.payoutMultiplierByHandCategory[handCategory as HandCategory];
      }
      
      holdOptions.push({
        holdMask,
        heldPlayingCardIndices,
        discardCount,
        expectedValue: expectedMultiplier * this.bet,
        expectedMultiplier,
        handCategoryProbabilities,
        resultType: tallyResult.resultType,
        sampleSize: tallyResult.totalTrialCount
      });
    }
    
    return holdOptions.sort((holdOptionA, holdOptionB) => holdOptionB.expectedValue - holdOptionA.expectedValue);
  }
  
  /** 最も EV が高い保持パターンだけを返すショートカット */
  public recommendBestHold(dealtPokerPlayingCards: Array<PokerPlayingCard>, holdCalculationOptions?: HoldCalculationOptions): HoldOption {
    return this.evaluateAllHoldOptions(dealtPokerPlayingCards, holdCalculationOptions)[0];
  }
  
  /** ポーカー用トランプカードがジョーカーか否かを判定する型ガード */
  private isJokerPlayingCard(pokerPlayingCard: PokerPlayingCard): pokerPlayingCard is JokerPlayingCard {
    return pokerPlayingCard.suit === 'joker';
  }
  
  /** ポーカー用トランプカードを一意に識別する文字列キーを作る (Set での重複判定に使う) */
  private playingCardKey(pokerPlayingCard: PokerPlayingCard): string {
    return this.isJokerPlayingCard(pokerPlayingCard) ? 'joker' : `${pokerPlayingCard.suit}-${pokerPlayingCard.rank}`;
  }
  
  /** 52枚 + ジョーカー1枚の完全なポーカー用トランプカードデッキを組み立てる */
  private buildFullPokerPlayingCardDeck(): Array<PokerPlayingCard> {
    /** スート・ランクの全組合せとジョーカーを格納するデッキ */
    const pokerPlayingCardDeck: Array<PokerPlayingCard> = [];
    for(const suit of this.allSuits) {
      for(const rank of this.allRanks) {
        pokerPlayingCardDeck.push({ suit, rank });
      }
    }
    pokerPlayingCardDeck.push({ suit: 'joker' });
    return pokerPlayingCardDeck;
  }
  
  /**
   * 配られたトランプカード5枚を除いた残りデッキを作る
   * 
   * このゲームは「配られた5枚 (保持・非保持を問わず) と同じトランプカードは差し替え後も出現しない」仕様なので、5枚まるごと除外すればよい
   */
  private buildRemainingPokerPlayingCardDeck(dealtPokerPlayingCards: Array<PokerPlayingCard>): Array<PokerPlayingCard> {
    /** 完全なデッキから最初の手札を除外するためのトランプカードキー */
    const dealtPokerPlayingCardKeys = new Set(dealtPokerPlayingCards.map(dealtPokerPlayingCard => this.playingCardKey(dealtPokerPlayingCard)));
    return this.buildFullPokerPlayingCardDeck().filter(pokerPlayingCard => !dealtPokerPlayingCardKeys.has(this.playingCardKey(pokerPlayingCard)));
  }
  
  /**
   * nCk (n 個から k 個選ぶ組合せの数) を、実際に組合せを列挙せずに計算する
   * 
   * これを使って「全列挙すると何通りになるか」を事前に見積もり、厳密計算とサンプリングのどちらを使うかを判断する
   */
  private countCombinations(totalCount: number, chooseCount: number): number {
    if(chooseCount < 0 || chooseCount > totalCount) return 0;
    /** nCk と nC(n-k) が等しい性質を利用して乗除算回数を減らした選択数 */
    const effectiveChooseCount = Math.min(chooseCount, totalCount - chooseCount);
    /** 各段階の乗除算で更新する組合せ数 */
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
    /** 選択可能な全要素数 */
    const itemCount = items.length;
    if(chooseCount === 0) {
      yield [];
      return;
    }
    if(chooseCount > itemCount) return;
    
    /** 現在の組合せが参照する要素位置・最初は先頭 `chooseCount` 個 */
    const selectedIndices = Array.from({ length: chooseCount }, (_, selectedPosition) => selectedPosition);
    while(true) {
      yield selectedIndices.map(selectedIndex => items[selectedIndex]);
      
      /** 右端から探索する、まだ繰り上げ可能な選択位置 */
      let selectedIndexPointer = chooseCount - 1;
      while(selectedIndexPointer >= 0 && selectedIndices[selectedIndexPointer] === itemCount - chooseCount + selectedIndexPointer) selectedIndexPointer--;
      if(selectedIndexPointer < 0) return;  // これ以上繰り上げられない = 全ての組合せを列挙し終えた
      
      selectedIndices[selectedIndexPointer]++;
      for(let refillPosition = selectedIndexPointer + 1; refillPosition < chooseCount; refillPosition++) {
        selectedIndices[refillPosition] = selectedIndices[refillPosition - 1] + 1;
      }
    }
  }
  
  /**
   * 保持トランプカード + 残りデッキから `discardCount` 枚を選ぶ全組合せを実際に列挙し、それぞれの役を判定して、役ごとの出現回数を正確に数え上げる
   * 
   * 組合せ数が少ない場合のみ使う想定 (厳密だが組合せ数に比例して遅い)
   */
  private tallyByExactEnumeration(heldPokerPlayingCards: Array<PokerPlayingCard>, remainingPokerPlayingCardDeck: Array<PokerPlayingCard>, discardCount: number): HandCategoryTally {
    /** 全組合せで成立した役別の回数 */
    const handCategoryCounts: Partial<Record<HandCategory, number>> = {};
    /** 実際に列挙して役を判定した組合せ数 */
    let totalTrialCount = 0;
    
    for(const drawnPokerPlayingCards of this.generateCombinations(remainingPokerPlayingCardDeck, discardCount)) {
      /** 保持分と現在の交換候補を組み合わせた最終的な役 */
      const handCategory = this.evaluateHand([...heldPokerPlayingCards, ...drawnPokerPlayingCards]);
      handCategoryCounts[handCategory] = (handCategoryCounts[handCategory] ?? 0) + 1;
      totalTrialCount++;
    }
    
    return { handCategoryCounts, totalTrialCount, resultType: 'exact' };
  }
  
  /**
   * モンテカルロサンプリングにより、役ごとの出現回数を近似的に数え上げる
   * 
   * 組合せ数が膨大 (捨て4〜5枚) な場合に、全列挙の代わりに使う
   * 
   * 毎試行、残りデッキ (`pokerPlayingCardShufflePool`) の先頭 `discardCount` 枚を Fisher-Yates の部分シャッフルでランダムに入れ替えることで
   * 重複なくランダムな `discardCount` 枚を高速に取り出す (デッキ配列自体は使い回し、コピーしない)
   */
  private tallyBySampling(heldPokerPlayingCards: Array<PokerPlayingCard>, remainingPokerPlayingCardDeck: Array<PokerPlayingCard>, discardCount: number, sampleSize: number): HandCategoryTally {
    /** サンプリングで成立した役別の回数 */
    const handCategoryCounts: Partial<Record<HandCategory, number>> = {};
    /** 各試行で先頭の交換枚数分だけ部分シャッフルする再利用可能なデッキ */
    const pokerPlayingCardShufflePool = remainingPokerPlayingCardDeck.slice();
    
    for(let trialIndex = 0; trialIndex < sampleSize; trialIndex++) {
      for(let playingCardPosition = 0; playingCardPosition < discardCount; playingCardPosition++) {
        /** 現在位置にランダムに移動する残り範囲内のインデックス */
        const swapPlayingCardIndex = playingCardPosition + Math.floor(Math.random() * (pokerPlayingCardShufflePool.length - playingCardPosition));
        [pokerPlayingCardShufflePool[playingCardPosition], pokerPlayingCardShufflePool[swapPlayingCardIndex]] = [pokerPlayingCardShufflePool[swapPlayingCardIndex], pokerPlayingCardShufflePool[playingCardPosition]];
      }
      /** 部分シャッフル後の先頭から取得した交換分のトランプカード */
      const drawnPokerPlayingCards = pokerPlayingCardShufflePool.slice(0, discardCount);
      /** 保持分とサンプリングした交換分を組み合わせた最終的な役 */
      const handCategory = this.evaluateHand([...heldPokerPlayingCards, ...drawnPokerPlayingCards]);
      handCategoryCounts[handCategory] = (handCategoryCounts[handCategory] ?? 0) + 1;
    }
    
    return { handCategoryCounts, totalTrialCount: sampleSize, resultType: 'sampled' };
  }
}

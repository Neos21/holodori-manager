import { describe, expect, it } from 'vitest';

import { PokerService } from './poker-service';

import type { PlayingCard } from '../types/playing-card-types';
import type { HandCategory, PokerPlayingCard } from '../types/poker-types';

type HandTestCase = {
  name: string;
  playingCards: Array<PlayingCard>;
  expectedHandCategory: HandCategory;
};

/** スートとランクから通常のトランプカードを生成する */
const makePlayingCard = (suit: PlayingCard['suit'], rank: PlayingCard['rank']): PlayingCard => ({ suit, rank });

/** ポーカーの役判定と保持期待値を検証する Service */
const pokerService = new PokerService();

describe('PokerService', () => {
  describe('evaluatePlainHand()', () => {
    const handTestCases: Array<HandTestCase> = [
      {
        name: 'ロイヤルフラッシュ',
        playingCards: [makePlayingCard('spade', 10), makePlayingCard('spade', 11), makePlayingCard('spade', 12), makePlayingCard('spade', 13), makePlayingCard('spade', 14)],
        expectedHandCategory: 'royalFlush'
      },
      {
        name: 'ストレートフラッシュ',
        playingCards: [makePlayingCard('heart', 4), makePlayingCard('heart', 5), makePlayingCard('heart', 6), makePlayingCard('heart', 7), makePlayingCard('heart', 8)],
        expectedHandCategory: 'straightFlush'
      },
      {
        name: 'フォーカード',
        playingCards: [makePlayingCard('spade', 9), makePlayingCard('heart', 9), makePlayingCard('diamond', 9), makePlayingCard('club', 9), makePlayingCard('spade', 3)],
        expectedHandCategory: 'fourCard'
      },
      {
        name: 'フルハウス',
        playingCards: [makePlayingCard('spade', 9), makePlayingCard('heart', 9), makePlayingCard('diamond', 9), makePlayingCard('club', 3), makePlayingCard('spade', 3)],
        expectedHandCategory: 'fullHouse'
      },
      {
        name: 'フラッシュ',
        playingCards: [makePlayingCard('club', 2), makePlayingCard('club', 5), makePlayingCard('club', 9), makePlayingCard('club', 11), makePlayingCard('club', 13)],
        expectedHandCategory: 'flush'
      },
      {
        name: 'ストレート (10-A、A は最大扱いで OK)',
        playingCards: [makePlayingCard('spade', 10), makePlayingCard('heart', 11), makePlayingCard('diamond', 12), makePlayingCard('club', 13), makePlayingCard('spade', 14)],
        expectedHandCategory: 'straight'
      },
      {
        name: 'J-Q-K-A-2 はストレート不成立 (A は 2 に接続しない)',
        playingCards: [makePlayingCard('spade', 11), makePlayingCard('heart', 12), makePlayingCard('diamond', 13), makePlayingCard('club', 14), makePlayingCard('spade', 2)],
        expectedHandCategory: 'none'
      },
      {
        name: 'スリーカード',
        playingCards: [makePlayingCard('spade', 7), makePlayingCard('heart', 7), makePlayingCard('diamond', 7), makePlayingCard('club', 2), makePlayingCard('spade', 9)],
        expectedHandCategory: 'threeCard'
      },
      {
        name: 'ツーペア',
        playingCards: [makePlayingCard('spade', 7), makePlayingCard('heart', 7), makePlayingCard('diamond', 4), makePlayingCard('club', 4), makePlayingCard('spade', 9)],
        expectedHandCategory: 'twoPair'
      },
      {
        name: 'ワンペア (配当なしだが役としては成立)',
        playingCards: [makePlayingCard('spade', 7), makePlayingCard('heart', 7), makePlayingCard('diamond', 4), makePlayingCard('club', 5), makePlayingCard('spade', 9)],
        expectedHandCategory: 'onePair'
      },
      {
        name: '役なし',
        playingCards: [makePlayingCard('spade', 2), makePlayingCard('heart', 5), makePlayingCard('diamond', 9), makePlayingCard('club', 11), makePlayingCard('spade', 13)],
        expectedHandCategory: 'none'
      }
    ];
    
    it.each(handTestCases)('$name', ({ playingCards, expectedHandCategory }) => {
      expect(pokerService.evaluatePlainHand(playingCards)).toBe(expectedHandCategory);
    });
  });
  
  describe('evaluateHandWithJoker()', () => {
    const handTestCases: Array<HandTestCase> = [
      {
        name: '同ランク4枚 + ジョーカー = ファイブカード',
        playingCards: [makePlayingCard('spade', 6), makePlayingCard('heart', 6), makePlayingCard('diamond', 6), makePlayingCard('club', 6)],
        expectedHandCategory: 'fiveCard'
      },
      {
        name: '3枚同ランク + ジョーカーでフォーカードに化ける',
        playingCards: [makePlayingCard('spade', 6), makePlayingCard('heart', 6), makePlayingCard('diamond', 6), makePlayingCard('club', 9)],
        expectedHandCategory: 'fourCard'
      },
      {
        name: 'ジョーカーでロイヤルフラッシュ完成',
        playingCards: [makePlayingCard('spade', 10), makePlayingCard('spade', 11), makePlayingCard('spade', 12), makePlayingCard('spade', 13)],
        expectedHandCategory: 'royalFlush'
      }
    ];
    
    it.each(handTestCases)('$name', ({ playingCards, expectedHandCategory }) => {
      expect(pokerService.evaluateHandWithJoker(playingCards)).toBe(expectedHandCategory);
    });
  });
  
  describe('evaluateHand()', () => {
    it('ジョーカーなしの5枚を判定する', () => {
      expect(pokerService.evaluateHand([
        makePlayingCard('spade', 2),
        makePlayingCard('spade', 3),
        makePlayingCard('spade', 4),
        makePlayingCard('spade', 5),
        makePlayingCard('spade', 6)
      ])).toBe('straightFlush');
    });
  });
  
  describe('evaluateAllHoldOptions()', () => {
    it('shortcut モードでは交換枚数に応じて厳密計算とサンプリングを使い分ける', () => {
      const dealtPokerPlayingCards: Array<PokerPlayingCard> = [
        makePlayingCard('spade'  ,  9),
        makePlayingCard('heart'  ,  9),
        makePlayingCard('diamond',  4),
        makePlayingCard('club'   , 11),
        makePlayingCard('spade'  ,  2)
      ];
      const holdOptions = pokerService.evaluateAllHoldOptions(dealtPokerPlayingCards, { sampleSize: 1 });
      const resultTypeByDiscardCount = new Map(holdOptions.map(holdOption => [holdOption.discardCount, holdOption.resultType]));
      
      expect(resultTypeByDiscardCount).toEqual(new Map([
        [0, 'exact'],
        [1, 'exact'],
        [2, 'exact'],
        [3, 'exact'],
        [4, 'sampled'],
        [5, 'sampled']
      ]));
    });
  });
});

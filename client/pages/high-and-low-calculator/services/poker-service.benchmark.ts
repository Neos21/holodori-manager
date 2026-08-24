import { bench, describe } from 'vitest';

import { PokerService } from './poker-service';

import type { PlayingCard } from '../types/playing-card-types';
import type { PokerPlayingCard } from '../types/poker-types';

/** スートとランクから通常のトランプカードを生成する */
const makePlayingCard = (suit: PlayingCard['suit'], rank: PlayingCard['rank']): PlayingCard => ({ suit, rank });

/** ショートカット計算と厳密計算を比較する交換前のトランプカード5枚 */
const dealtPokerPlayingCards: Array<PokerPlayingCard> = [
  makePlayingCard('spade'  ,  9),
  makePlayingCard('heart'  ,  9),
  makePlayingCard('diamond',  4),
  makePlayingCard('club'   , 11),
  makePlayingCard('spade'  ,  2)
];

/** 保持パターンの計算速度を検証する Service */
const pokerService = new PokerService();

/** 重い厳密計算を繰り返さず両モードを1回ずつ比較するための実行条件 */
const benchmarkOptions = {
  iterations: 1,
  time: 0,
  warmupIterations: 0,
  warmupTime: 0
};

describe('保持パターン計算', () => {
  bench('shortcut モード', () => {
    pokerService.evaluateAllHoldOptions(dealtPokerPlayingCards);
  }, benchmarkOptions);
  
  bench('exact モード', () => {
    pokerService.evaluateAllHoldOptions(dealtPokerPlayingCards, { mode: 'exact' });
  }, benchmarkOptions);
});

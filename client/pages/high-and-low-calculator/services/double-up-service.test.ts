import { describe, expect, it } from 'vitest';

import { DoubleUpService } from './double-up-service';

import type { PlayingCard } from '../types/playing-card-types';

/** スートとランクから通常のトランプカードを生成する */
const makePlayingCard = (suit: PlayingCard['suit'], rank: PlayingCard['rank']): PlayingCard => ({ suit, rank });

/** ダブルアップの成功確率と継続判断を検証する Service */
const doubleUpService = new DoubleUpService();

describe('DoubleUpService', () => {
  describe('calcProbabilities()', () => {
    it('7 提示時の higher 確率を計算する', () => {
      const probabilities = doubleUpService.calcProbabilities(makePlayingCard('heart', 7), []);
      
      expect(probabilities.higher).toBeCloseTo(28 / 48, 3);
    });
    
    it('7 提示時の lower 確率を計算する', () => {
      const probabilities = doubleUpService.calcProbabilities(makePlayingCard('heart', 7), []);
      
      expect(probabilities.lower).toBeCloseTo(20 / 48, 3);
    });
    
    it('エース提示時は higher が 0 になる', () => {
      expect(doubleUpService.calcProbabilities(makePlayingCard('heart', 14), []).higher).toBe(0);
    });
    
    it('2 提示時は lower が 0 になる', () => {
      expect(doubleUpService.calcProbabilities(makePlayingCard('heart', 2), []).lower).toBe(0);
    });
  });
  
  describe('recommendAction()', () => {
    it('EV が有利なら継続を推奨する', () => {
      const decision = doubleUpService.recommendAction({
        currentCoins         : 200,
        bestSideProbability  : 28 / 48,
        remainingBalanceCoins: 950,
        todayEarnedCoins     : 0,
        todayBetCoins        : 50
      });
      
      expect(decision.recommendation).toBe('continue');
    });
    
    it('プレイ内上限超なら強制辞退する', () => {
      const decision = doubleUpService.recommendAction({
        currentCoins         : 12_800,
        bestSideProbability  : .9,
        remainingBalanceCoins: 950,
        todayEarnedCoins     : 0,
        todayBetCoins        : 50
      });
      
      expect(decision.recommendation).toBe('collect');
    });
    
    it('所持金不足なら初回でも利確を推奨する', () => {
      const decision = doubleUpService.recommendAction({
        currentCoins         : 200,
        bestSideProbability  : .6,
        remainingBalanceCoins: 0,
        todayEarnedCoins     : 0,
        todayBetCoins        : 50
      });
      
      expect(decision.recommendation).toBe('collect');
    });
    
    it('利確で本日の赤字を解消できるなら利確を推奨する', () => {
      const decision = doubleUpService.recommendAction({
        currentCoins         : 400,
        bestSideProbability  : .6,
        remainingBalanceCoins: 500,
        todayEarnedCoins     : 200,
        todayBetCoins        : 600
      });
      
      expect(decision.recommendation).toBe('collect');
    });
    
    it('利確しても赤字なら期待値に基づいて継続を推奨する', () => {
      const decision = doubleUpService.recommendAction({
        currentCoins         : 200,
        bestSideProbability  : .6,
        remainingBalanceCoins: 500,
        todayEarnedCoins     : 0,
        todayBetCoins        : 600
      });
      
      expect(decision.recommendation).toBe('continue');
    });
  });
  
  describe('calcExpectedBestSideProbability()', () => {
    it('未使用デッキ全体で有利な側を選ぶ平均成功確率は 50% を超える', () => {
      expect(doubleUpService.calcExpectedBestSideProbability([])).toBeGreaterThan(.5);
    });
  });
});

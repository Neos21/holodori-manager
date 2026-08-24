import { type ReactElement, useState } from 'react';

import { PlayingCardInput, type PlayingCardSelection } from './playing-card-input';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { DoubleUpService } from '../services/double-up-service';

import type { PlayingCard } from '../types/playing-card-types';

/** ダブルアップ開始時の配当とゲーム終了イベント */
type DoubleUpSectionProps = {
  /** ポーカーの成立役から引き継ぐ最初の見込みコイン */
  initialCoins         : number;
  /** 現在進行中のプレイのベットを支払った後の所持金 */
  remainingBalanceCoins: number;
  /** 本日確定済みの総獲得コイン */
  todayEarnedCoins     : number;
  /** 現在進行中のプレイを含む本日のベット累計 */
  todayBetCoins        : number;
  /** 辞退または上限到達で確定したコインを親ページに通知するイベント */
  onCollect            : (coins: number, isForced: boolean) => void;
  /** 失敗により獲得0枚で新規プレイに戻すイベント */
  onLose               : () => void;
};

/** ゲーム画面で選択する次のトランプカードの予測方向 (たかい or ひくい) */
type Prediction = 'higher' | 'lower';

/** 提示トランプカードを未選択に戻す際に使用する入力状態 */
const emptyPlayingCardSelection: PlayingCardSelection = { suit: null, rank: null, isJoker: false };

/** 入力途中の値を確定済みトランプカードに変換する・未確定なら `null` */
const toPlayingCard = (playingCardSelection: PlayingCardSelection): PlayingCard | null => {
  if(playingCardSelection.suit == null || playingCardSelection.rank == null) return null;
  return { suit: playingCardSelection.suit, rank: playingCardSelection.rank };
};

/** 数値ランクをゲーム画面上のトランプカード表記に変換する */
const rankDisplayName = (rank: PlayingCard['rank']): string => {
  if(rank === 11) return 'J';
  if(rank === 12) return 'Q';
  if(rank === 13) return 'K';
  if(rank === 14) return 'A';
  return String(rank);
};

/** スートをゲーム画面上の記号に変換する */
const suitDisplayName = (suit: PlayingCard['suit']): string => {
  if(suit === 'spade'  ) return '♠';
  if(suit === 'heart'  ) return '♥';
  if(suit === 'diamond') return '♦';
  return '♣';
};

/** トランプカードをゲーム画面上のスートとランク表記に変換する */
const playingCardDisplayName = (playingCard: PlayingCard): string => `${suitDisplayName(playingCard.suit)}${rankDisplayName(playingCard.rank)}`;

/** ダブルアップの継続判断、提示カードの確率表示、実際の結果入力を扱う */
export const DoubleUpSection = ({ initialCoins, remainingBalanceCoins, todayEarnedCoins, todayBetCoins, onCollect, onLose }: DoubleUpSectionProps): ReactElement => {
  /** 成功確率、継続判断、1プレイ上限判定を担当する Service */
  const doubleUpService = new DoubleUpService();
  
  const [currentCoins                , setCurrentCoins                ] = useState<number>(initialCoins);                             // 現在のダブルアップ対象コイン
  const [seenPlayingCards            , setSeenPlayingCards            ] = useState<Array<PlayingCard>>([]);                           // 現在の提示カードより前に登場し、確率計算から除外するカード
  const [isChallengeActive           , setIsChallengeActive           ] = useState<boolean>(false);                                   // 挑戦中として予測とめくられたカードを入力するか否か
  const [shownPlayingCardSelection   , setShownPlayingCardSelection   ] = useState<PlayingCardSelection>(emptyPlayingCardSelection);  // 大小比較の基準となる現在の提示カード
  const [revealedPlayingCardSelection, setRevealedPlayingCardSelection] = useState<PlayingCardSelection>(emptyPlayingCardSelection);  // 予測後にめくられたカード
  const [playingCardInputError       , setPlayingCardInputError       ] = useState<string>('');                                       // 既出カードを再入力した場合のエラー
  
  /** 現在の入力が確定している場合の提示トランプカード・入力途中なら `null` */
  const shownPlayingCard = toPlayingCard(shownPlayingCardSelection);
  /** 現在の提示トランプカードに対する両予測の成功確率・未確定なら `null` */
  const doubleUpProbabilities = shownPlayingCard == null ? null : doubleUpService.calcProbabilities(shownPlayingCard, seenPlayingCards);
  /** 現在の提示トランプカードに対して成功確率が高い予測方向 */
  const recommendedPrediction: Prediction | null = doubleUpProbabilities == null ? null : doubleUpProbabilities.higher >= doubleUpProbabilities.lower ? 'higher' : 'lower';
  /** 現在の提示カードで有利な側を選んだ場合の成功確率 */
  const bestSideProbability = doubleUpProbabilities == null ? 0 : Math.max(doubleUpProbabilities.higher, doubleUpProbabilities.lower);
  /** 提示カードが不明な初回は残りデッキ全体の平均、判明後は現在の提示カードで有利な側を選んだ成功確率 */
  const decisionProbability = shownPlayingCard == null ? doubleUpService.calcExpectedBestSideProbability(seenPlayingCards) : bestSideProbability;
  /** 現在コイン、成功確率、日次収支、所持金から導出した継続・辞退の推奨 */
  const doubleUpDecision = doubleUpService.recommendAction({ currentCoins, bestSideProbability: decisionProbability, remainingBalanceCoins, todayEarnedCoins, todayBetCoins });
  /** 現在の見込みコインを利確した場合の本日の収支 */
  const todayNetCoinsIfCollect = todayEarnedCoins - todayBetCoins + currentCoins;
  
  /** 提示カード入力を更新し、以前の結果入力を消去する */
  const onChangeShownPlayingCard = (playingCardSelection: PlayingCardSelection): void => {
    setShownPlayingCardSelection(playingCardSelection);
    setRevealedPlayingCardSelection(emptyPlayingCardSelection);
    setPlayingCardInputError('');
  };
  
  /** 次のダブルアップ挑戦を開始する */
  const onStartChallenge = (): void => {
    setIsChallengeActive(true);
    setRevealedPlayingCardSelection(emptyPlayingCardSelection);
    setPlayingCardInputError('');
  };
  
  /** めくられたカードから成否を自動判定し、成功時はコインを倍化する */
  const onChangeRevealedPlayingCard = (playingCardSelection: PlayingCardSelection): void => {
    setRevealedPlayingCardSelection(playingCardSelection);
    const revealedPlayingCard = toPlayingCard(playingCardSelection);
    if(shownPlayingCard == null || revealedPlayingCard == null || recommendedPrediction == null) return;
    
    /** 現在までに登場したカードと同じカードを入力しているか否か */
    const isRevealedPlayingCardUsed = [...seenPlayingCards, shownPlayingCard].some(seenPlayingCard => seenPlayingCard.suit === revealedPlayingCard.suit && seenPlayingCard.rank === revealedPlayingCard.rank);
    if(isRevealedPlayingCardUsed) return setPlayingCardInputError('以前に提示されたカードと同じカードは選択できません');
    
    /** 成功確率が高い予測方向と2枚のランク比較から判定した成功か否か */
    const isSuccess = (recommendedPrediction === 'higher' && revealedPlayingCard.rank > shownPlayingCard.rank)
                   || (recommendedPrediction === 'lower'  && revealedPlayingCard.rank < shownPlayingCard.rank);
    /** 次回の確率計算から現在の提示カードを除外した既出カード */
    const nextSeenPlayingCards = [...seenPlayingCards, shownPlayingCard];
    
    if(revealedPlayingCard.rank !== shownPlayingCard.rank && !isSuccess) return onLose();
    
    setSeenPlayingCards(nextSeenPlayingCards);
    setShownPlayingCardSelection(playingCardSelection);
    setRevealedPlayingCardSelection(emptyPlayingCardSelection);
    setPlayingCardInputError('');
    
    if(revealedPlayingCard.rank === shownPlayingCard.rank) return;
    
    /** 成功によって倍増し、上限判定後に次回に引き継ぐ見込みコイン */
    const nextCoins = currentCoins * 2;
    if(doubleUpService.isPerPlayCapExceeded(nextCoins)) return onCollect(nextCoins, true);
    
    setCurrentCoins(nextCoins);
    setIsChallengeActive(false);
  };
  
  return (
    <section>
      <h2 className="mb-2 text-xl font-bold">ダブルアップチャンス</h2>
      
      <p className="mb-4">
        <span className="text-sm text-base-content/60">現在の見込みコイン : </span><span className="text-lg font-bold text-info">{currentCoins.toLocaleString()}枚</span>
      </p>
      
      {!isChallengeActive ? (
        <>
          <h3 className="mb-2 text-lg font-bold">挑戦するか選択する</h3>
          
          {shownPlayingCard != null && (
            <div className="mb-4 alert alert-soft alert-info">
              <div>次の提示カード : <span className="font-bold">{playingCardDisplayName(shownPlayingCard)}</span>・有利な側の成功確率 : <span className="font-bold">{(bestSideProbability * 100).toFixed(1)}%</span></div>
            </div>
          )}
          
          {shownPlayingCard == null && (
            <div className="mb-4 alert alert-soft alert-info">次の提示カードが不明な状態で有利な側を選び続けた平均成功確率 : <span className="font-bold">{(decisionProbability * 100).toFixed(1)}%</span></div>
          )}
          
          <p className="mb-2 text-sm text-base-content/60">今ここで利確した場合 : 所持金 {(remainingBalanceCoins + currentCoins).toLocaleString()}枚・本日の収支 {todayNetCoinsIfCollect.toLocaleString()}枚</p>
          <p className={`mb-4 font-bold ${doubleUpDecision.recommendation === 'continue' ? 'text-success' : 'text-warning'}`}>{doubleUpDecision.reason}</p>
          
          <div className="flex gap-2">
            <button type="button" className="btn btn-info"    onClick={onStartChallenge} disabled={doubleUpDecision.isForced}>挑戦する</button>
            <button type="button" className="btn btn-outline" onClick={() => onCollect(currentCoins, false)}>辞退する (利確)</button>
          </div>
        </>
      ) : (
        <>
          <h3 className="mb-3 text-lg font-bold">提示カードと予測</h3>
          
          <button type="button" className="btn mb-4 btn-outline btn-sm" onClick={() => onCollect(currentCoins, false)}>辞退する (利確)</button>
          
          {seenPlayingCards.length === 0 ? (
            <div className="mb-4 overflow-x-auto">
              <div className="max-w-42">
                <PlayingCardInput
                  label="提示カード"
                  playingCardSelection={shownPlayingCardSelection}
                  onChangePlayingCardSelection={onChangeShownPlayingCard}
                />
              </div>
            </div>
          ) : shownPlayingCard != null && (
            <div className="mb-4 alert alert-soft alert-info">現在の提示カード : {playingCardDisplayName(shownPlayingCard)}</div>
          )}
          
          {doubleUpProbabilities != null && (
            <>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className={`rounded-box border py-3 text-center ${recommendedPrediction === 'higher' ? 'border-success bg-success/10 font-bold' : 'border-base-300'}`}>
                  たかい : {(doubleUpProbabilities.higher * 100).toFixed(1)}%{recommendedPrediction === 'higher' ? ' (推奨)' : ''}
                </div>
                <div className={`rounded-box border py-3 text-center ${recommendedPrediction === 'lower' ? 'border-success bg-success/10 font-bold' : 'border-base-300'}`}>
                  ひくい : {(doubleUpProbabilities.lower * 100).toFixed(1)}%{recommendedPrediction === 'lower' ? ' (推奨)' : ''}
                </div>
              </div>
              
              <p className="mb-4 text-sm text-base-content/60">同じ数字の残りトランプカード : {doubleUpProbabilities.sameRankRemainingPlayingCardCount}枚</p>
              
              <h4 className="mb-2 font-bold">めくられたカード</h4>
              <div className="mb-4 overflow-x-auto">
                <div className="max-w-42">
                  <PlayingCardInput
                    label="結果"
                    playingCardSelection={revealedPlayingCardSelection}
                    onChangePlayingCardSelection={onChangeRevealedPlayingCard}
                  />
                </div>
              </div>
              
              {!isEmpty(playingCardInputError) && (
                <div className="mb-4 alert alert-soft alert-error">{playingCardInputError}</div>
              )}
              
              <button type="button" className="btn btn-error" onClick={onLose}>失敗 (外した)</button>
            </>
          )}
        </>
      )}
    </section>
  );
};

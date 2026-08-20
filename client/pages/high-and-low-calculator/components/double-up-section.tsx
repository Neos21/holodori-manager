import { type ReactElement, useState } from 'react';

import { PlayingCardInput, type PlayingCardSelection } from './playing-card-input';
import { DoubleUpService } from '../services/double-up-service';

import type { PlayingCard } from '../types/playing-card-types';

type DoubleUpSectionProps = {
  initialCoins: number;
  onCollect   : (coins: number, isForced: boolean) => void;
  onLose      : () => void;
};

type Prediction = 'higher' | 'lower';

type ChallengeResult = 'success' | 'same-rank' | 'failure';

type ExpectedNextPlayingCard = {
  previousPlayingCard: PlayingCard;
  relation           : Prediction | 'same-rank';
};

const emptyPlayingCardSelection: PlayingCardSelection = { suit: null, rank: null, isJoker: false };

/** 入力途中の値を確定済みカードへ変換する・未確定なら `null` */
const toPlayingCard = (playingCardSelection: PlayingCardSelection): PlayingCard | null => {
  if(playingCardSelection.suit == null || playingCardSelection.rank == null) return null;
  return { suit: playingCardSelection.suit, rank: playingCardSelection.rank };
};

/** 数値ランクをゲーム上の表記に変換する */
const rankDisplayName = (rank: PlayingCard['rank']): string => {
  if(rank === 11) return 'J';
  if(rank === 12) return 'Q';
  if(rank === 13) return 'K';
  if(rank === 14) return 'A';
  return String(rank);
};

/** ダブルアップの継続判断、提示カードの確率表示、実際の結果入力を扱う */
export const DoubleUpSection = ({ initialCoins, onCollect, onLose }: DoubleUpSectionProps): ReactElement => {
  const doubleUpService = new DoubleUpService();
  
  const [currentCoins             , setCurrentCoins             ] = useState<number>(initialCoins);                             // 現在のダブルアップ対象コイン
  const [seenPlayingCards         , setSeenPlayingCards         ] = useState<Array<PlayingCard>>([]);                           // 確率計算から除外する過去の提示カード
  const [isChallengeActive        , setIsChallengeActive        ] = useState<boolean>(true);                                    // 挑戦を選び、提示カードと予測を入力中か否か
  const [isInitialChallenge       , setIsInitialChallenge       ] = useState<boolean>(true);                                    // ポーカー成立直後の初回挑戦か否か
  const [shownPlayingCardSelection, setShownPlayingCardSelection] = useState<PlayingCardSelection>(emptyPlayingCardSelection);  // 現在の提示カード・入力途中の値を含む
  const [prediction               , setPrediction               ] = useState<Prediction | ''>('');                              // ユーザがゲーム内で選んだ「たかい」「ひくい」
  const [expectedNextPlayingCard  , setExpectedNextPlayingCard  ] = useState<ExpectedNextPlayingCard | null>(null);             // 前回入力した結果から決まる次の提示カードの大小関係
  
  const shownPlayingCard = toPlayingCard(shownPlayingCardSelection);
  const isShownPlayingCardUsed = shownPlayingCard == null ? false : seenPlayingCards.some(seenPlayingCard => seenPlayingCard.suit === shownPlayingCard.suit && seenPlayingCard.rank === shownPlayingCard.rank);
  const probabilities = shownPlayingCard == null || isShownPlayingCardUsed ? null : doubleUpService.calcProbabilities(shownPlayingCard, seenPlayingCards);
  const recommendedPrediction: Prediction | null = probabilities == null ? null : probabilities.higher >= probabilities.lower ? 'higher' : 'lower';
  const expectedBestSideProbability = doubleUpService.calcExpectedBestSideProbability(seenPlayingCards);
  const decision = doubleUpService.recommendAction({ currentCoins, bestSideProbability: expectedBestSideProbability });
  const hasExpectedRelationMismatch = shownPlayingCard != null && expectedNextPlayingCard != null && (
       (expectedNextPlayingCard.relation === 'higher'    && shownPlayingCard.rank <=  expectedNextPlayingCard.previousPlayingCard.rank)
    || (expectedNextPlayingCard.relation === 'lower'     && shownPlayingCard.rank >=  expectedNextPlayingCard.previousPlayingCard.rank)
    || (expectedNextPlayingCard.relation === 'same-rank' && shownPlayingCard.rank !== expectedNextPlayingCard.previousPlayingCard.rank)
  );
  const expectedRankCondition = expectedNextPlayingCard == null
    ? ''
    : `${rankDisplayName(expectedNextPlayingCard.previousPlayingCard.rank)}${expectedNextPlayingCard.relation === 'higher' ? 'より高い' : expectedNextPlayingCard.relation === 'lower' ? 'より低い' : 'と同じ'}数字`;
  
  /** 提示カード入力を更新し、以前に選んだ予測を消去する */
  const onChangeShownPlayingCard = (playingCardSelection: PlayingCardSelection): void => {
    setShownPlayingCardSelection(playingCardSelection);
    setPrediction('');
  };
  
  /** 次のダブルアップ挑戦を開始する */
  const onStartChallenge = (): void => {
    setIsChallengeActive(true);
    setShownPlayingCardSelection(emptyPlayingCardSelection);
    setPrediction('');
  };
  
  /** 実際のゲーム結果を反映し、成功時はコインを倍化する */
  const onSelectResult = (challengeResult: ChallengeResult): void => {
    if(shownPlayingCard == null || prediction === '' || isShownPlayingCardUsed) return;
    if(challengeResult === 'failure') return onLose();
    
    setIsInitialChallenge(false);
    setSeenPlayingCards(currentSeenPlayingCards => [...currentSeenPlayingCards, shownPlayingCard]);
    setExpectedNextPlayingCard({ previousPlayingCard: shownPlayingCard, relation: challengeResult === 'same-rank' ? 'same-rank' : prediction });
    setShownPlayingCardSelection(emptyPlayingCardSelection);
    setPrediction('');
    
    if(challengeResult === 'same-rank') return;
    
    const nextCoins = currentCoins * 2;
    if(doubleUpService.isPerPlayCapExceeded(nextCoins)) return onCollect(nextCoins, true);
    
    setCurrentCoins(nextCoins);
    setIsChallengeActive(false);
  };
  
  return (
    <section>
      <h2 className="mb-2 text-xl font-bold">ダブルアップチャンス</h2>
      
      <p className="mb-4">
        <span className="text-base-content/60 text-sm">現在の見込みコイン : </span><span className="text-lg font-bold text-info">{currentCoins.toLocaleString()}枚</span>
      </p>
      
      {!isChallengeActive ? (
        <>
          <h3 className="mb-2 text-lg font-bold">挑戦するか選択する</h3>
          
          <p className="mb-2 text-sm">残りデッキで毎回有利な側を選ぶ場合の平均成功率 : <span className="font-bold text-base">{(expectedBestSideProbability * 100).toFixed(1)}%</span></p>
          <p className={`mb-4 font-bold ${decision.recommendation === 'continue' ? 'text-success' : 'text-warning'}`}>{decision.reason}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-info"    onClick={onStartChallenge} disabled={decision.recommendation === 'collect'}>挑戦する</button>
            <button type="button" className="btn btn-outline" onClick={() => onCollect(currentCoins, false)}>辞退する</button>
          </div>
        </>
      ) : (
        <>
          <h3 className="mb-3 text-lg font-bold">提示カードと予測</h3>
          
          {isInitialChallenge && (
            <button type="button" className="btn btn-sm btn-outline mb-4" onClick={() => onCollect(currentCoins, false)}>ダブルアップせず辞退する</button>
          )}
          
          <div className="mb-4 max-w-38">
            <PlayingCardInput label="提示カード" value={shownPlayingCardSelection} onChange={onChangeShownPlayingCard} />
          </div>
          
          {isShownPlayingCardUsed && (
            <div className="alert alert-error alert-soft mb-4">以前に提示されたカードと同じカードは選択できません</div>
          )}
          
          {hasExpectedRelationMismatch && expectedNextPlayingCard != null && (
            <div className="alert alert-warning alert-soft mb-4">前回の入力結果では、今回のカードは「{expectedRankCondition}」である必要があります。入力したカードの数字を確認してください</div>
          )}
          
          {probabilities != null && (
            <>
              <div className="grid gap-2 grid-cols-2 mb-4">
                <button
                  type="button"
                  className={`btn h-auto py-3 ${prediction === 'higher' ? 'btn-info' : recommendedPrediction === 'higher' ? 'btn-success btn-outline' : 'btn-outline'}`}
                  onClick={() => setPrediction('higher')}
                >
                  たかい : {(probabilities.higher * 100).toFixed(1)}%{recommendedPrediction === 'higher' ? ' (推奨)' : ''}
                </button>
                <button
                  type="button"
                  className={`btn h-auto py-3 ${prediction === 'lower'  ? 'btn-info' : recommendedPrediction === 'lower'  ? 'btn-success btn-outline' : 'btn-outline'}`}
                  onClick={() => setPrediction('lower')}
                >
                  ひくい : {(probabilities.lower * 100).toFixed(1)}%{recommendedPrediction === 'lower' ? ' (推奨)' : ''}
                </button>
              </div>
              
              <p className="mb-4 text-base-content/60 text-sm">同じ数字の残りカード : {probabilities.sameRankRemaining}枚</p>
              
              <h4 className="mb-2 font-bold">ゲーム内の結果</h4>
              <div className="flex gap-2">
                <button type="button" className="btn btn-success" onClick={() => onSelectResult('success'  )} disabled={prediction === ''}>成功</button>
                <button type="button" className="btn btn-warning" onClick={() => onSelectResult('same-rank')} disabled={prediction === ''}>同じ数字</button>
                <button type="button" className="btn btn-error"   onClick={() => onSelectResult('failure'  )} disabled={prediction === ''}>失敗</button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
};

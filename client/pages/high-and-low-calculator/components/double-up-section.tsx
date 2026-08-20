import { type ReactElement, useState } from 'react';

import { PlayingCardInput, type PlayingCardSelection } from './playing-card-input';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { DoubleUpService } from '../services/double-up-service';

import type { PlayingCard } from '../types/playing-card-types';

/** ダブルアップ開始時の配当とゲーム終了イベント */
type DoubleUpSectionProps = {
  /** ポーカーの成立役から引き継ぐ最初の見込みコイン */
  initialCoins: number;
  /** 辞退または上限到達で確定したコインを親ページに通知するイベント */
  onCollect   : (coins: number, isForced: boolean) => void;
  /** 失敗により獲得0枚で新規プレイに戻すイベント */
  onLose      : () => void;
};

/** ゲーム画面で選択する次のトランプカードの予測方向 (たかい or ひくい) */
type Prediction = 'higher' | 'lower';

/** 予測後にゲーム画面に表示された結果 (成功・同値・失敗) */
type ChallengeResult = 'success' | 'same-rank' | 'failure';

/** 前回の予測結果から制約される次の提示トランプカード */
type ExpectedNextPlayingCard = {
  /** 大小関係を比較する基準となる前回の提示トランプカード */
  previousPlayingCard: PlayingCard;
  /** 次の提示ランクに必要な大小関係 */
  relation           : Prediction | 'same-rank';
};

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

/** ダブルアップの継続判断、提示カードの確率表示、実際の結果入力を扱う */
export const DoubleUpSection = ({ initialCoins, onCollect, onLose }: DoubleUpSectionProps): ReactElement => {
  /** 成功確率、継続判断、1プレイ上限判定を担当する Service */
  const doubleUpService = new DoubleUpService();
  
  const [currentCoins             , setCurrentCoins             ] = useState<number>(initialCoins);                             // 現在のダブルアップ対象コイン
  const [seenPlayingCards         , setSeenPlayingCards         ] = useState<Array<PlayingCard>>([]);                           // 確率計算から除外する過去の提示カード
  const [isChallengeActive        , setIsChallengeActive        ] = useState<boolean>(true);                                    // 挑戦を選び、提示カードと予測を入力中か否か
  const [isInitialChallenge       , setIsInitialChallenge       ] = useState<boolean>(true);                                    // ポーカー成立直後の初回挑戦か否か
  const [shownPlayingCardSelection, setShownPlayingCardSelection] = useState<PlayingCardSelection>(emptyPlayingCardSelection);  // 現在の提示カード・入力途中の値を含む
  const [prediction               , setPrediction               ] = useState<Prediction | ''>('');                              // ユーザがゲーム内で選んだ「たかい」「ひくい」
  const [expectedNextPlayingCard  , setExpectedNextPlayingCard  ] = useState<ExpectedNextPlayingCard | null>(null);             // 前回入力した結果から決まる次の提示カードの大小関係
  
  /** 現在の入力が確定している場合の提示トランプカード・入力途中なら `null` */
  const shownPlayingCard = toPlayingCard(shownPlayingCardSelection);
  /** 現在の入力がダブルアップ中に既出のトランプカードと完全一致するか否か */
  const isShownPlayingCardUsed = shownPlayingCard == null ? false : seenPlayingCards.some(seenPlayingCard => seenPlayingCard.suit === shownPlayingCard.suit && seenPlayingCard.rank === shownPlayingCard.rank);
  /** 現在の提示トランプカードに対する両予測の成功確率・未確定または重複なら `null` */
  const doubleUpProbabilities = shownPlayingCard == null || isShownPlayingCardUsed ? null : doubleUpService.calcProbabilities(shownPlayingCard, seenPlayingCards);
  /** 現在の提示トランプカードに対して成功確率が高い予測方向 */
  const recommendedPrediction: Prediction | null = doubleUpProbabilities == null ? null : doubleUpProbabilities.higher >= doubleUpProbabilities.lower ? 'higher' : 'lower';
  /** 次の提示内容が不明な継続判断時に使用する残りデッキ全体の平均最善成功確率 */
  const expectedBestSideProbability = doubleUpService.calcExpectedBestSideProbability(seenPlayingCards);
  /** 現在コインと平均成功確率から導出した継続・辞退の推奨 */
  const doubleUpDecision = doubleUpService.recommendAction({ currentCoins, bestSideProbability: expectedBestSideProbability });
  /** 前回入力した成功・同値結果と現在の提示ランクが矛盾するか否か */
  const hasExpectedRelationMismatch = shownPlayingCard != null && expectedNextPlayingCard != null && (
       (expectedNextPlayingCard.relation === 'higher'    && shownPlayingCard.rank <=  expectedNextPlayingCard.previousPlayingCard.rank)
    || (expectedNextPlayingCard.relation === 'lower'     && shownPlayingCard.rank >=  expectedNextPlayingCard.previousPlayingCard.rank)
    || (expectedNextPlayingCard.relation === 'same-rank' && shownPlayingCard.rank !== expectedNextPlayingCard.previousPlayingCard.rank)
  );
  /** 矛盾警告に表示する前回ランクと必要な大小関係 */
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
    if(shownPlayingCard == null || isEmpty(prediction) || isShownPlayingCardUsed) return;
    if(challengeResult === 'failure') return onLose();
    
    setIsInitialChallenge(false);
    setSeenPlayingCards(currentSeenPlayingCards => [...currentSeenPlayingCards, shownPlayingCard]);
    setExpectedNextPlayingCard({ previousPlayingCard: shownPlayingCard, relation: challengeResult === 'same-rank' ? 'same-rank' : prediction as Prediction });
    setShownPlayingCardSelection(emptyPlayingCardSelection);
    setPrediction('');
    
    if(challengeResult === 'same-rank') return;
    
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
        <span className="text-base-content/60 text-sm">現在の見込みコイン : </span><span className="text-lg font-bold text-info">{currentCoins.toLocaleString()}枚</span>
      </p>
      
      {!isChallengeActive ? (
        <>
          <h3 className="mb-2 text-lg font-bold">挑戦するか選択する</h3>
          
          <p className="mb-2 text-sm">残りデッキで毎回有利な側を選ぶ場合の平均成功率 : <span className="font-bold text-base">{(expectedBestSideProbability * 100).toFixed(1)}%</span></p>
          <p className={`mb-4 font-bold ${doubleUpDecision.recommendation === 'continue' ? 'text-success' : 'text-warning'}`}>{doubleUpDecision.reason}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-info"    onClick={onStartChallenge} disabled={doubleUpDecision.recommendation === 'collect'}>挑戦する</button>
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
            <PlayingCardInput
              label="提示カード"
              playingCardSelection={shownPlayingCardSelection}
              onChangePlayingCardSelection={onChangeShownPlayingCard}
            />
          </div>
          
          {isShownPlayingCardUsed && (
            <div className="alert alert-error alert-soft mb-4">以前に提示されたカードと同じカードは選択できません</div>
          )}
          
          {hasExpectedRelationMismatch && expectedNextPlayingCard != null && (
            <div className="alert alert-warning alert-soft mb-4">前回の入力結果では、今回のカードは「{expectedRankCondition}」である必要があります。入力したカードの数字を確認してください</div>
          )}
          
          {doubleUpProbabilities != null && (
            <>
              <div className="grid gap-2 grid-cols-2 mb-4">
                <button
                  type="button"
                  className={`btn h-auto py-3 ${prediction === 'higher' ? 'btn-info' : recommendedPrediction === 'higher' ? 'btn-success btn-outline' : 'btn-outline'}`}
                  onClick={() => setPrediction('higher')}
                >
                  たかい : {(doubleUpProbabilities.higher * 100).toFixed(1)}%{recommendedPrediction === 'higher' ? ' (推奨)' : ''}
                </button>
                <button
                  type="button"
                  className={`btn h-auto py-3 ${prediction === 'lower'  ? 'btn-info' : recommendedPrediction === 'lower'  ? 'btn-success btn-outline' : 'btn-outline'}`}
                  onClick={() => setPrediction('lower')}
                >
                  ひくい : {(doubleUpProbabilities.lower * 100).toFixed(1)}%{recommendedPrediction === 'lower' ? ' (推奨)' : ''}
                </button>
              </div>
              
              <p className="mb-4 text-base-content/60 text-sm">同じ数字の残りトランプカード : {doubleUpProbabilities.sameRankRemainingPlayingCardCount}枚</p>
              
              <h4 className="mb-2 font-bold">ゲーム内の結果</h4>
              <div className="flex gap-2">
                <button type="button" className="btn btn-success" onClick={() => onSelectResult('success'  )} disabled={isEmpty(prediction)}>成功</button>
                <button type="button" className="btn btn-warning" onClick={() => onSelectResult('same-rank')} disabled={isEmpty(prediction)}>同じ数字</button>
                <button type="button" className="btn btn-error"   onClick={() => onSelectResult('failure'  )} disabled={isEmpty(prediction)}>失敗</button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
};

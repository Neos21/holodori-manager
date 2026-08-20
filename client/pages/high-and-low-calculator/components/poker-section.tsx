import { type ChangeEvent, type ReactElement, useState } from 'react';

import { PlayingCardInput, type PlayingCardSelection } from './playing-card-input';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { PokerService } from '../services/poker-service';

import type { CalculationMode, HandCategory, HoldOption, PokerPlayingCard } from '../types/poker-types';

/** ポーカー部分の表示制御とゲーム進行イベント */
type PokerSectionProps = {
  /** 日次上限超過により新しいプレイの入力を無効化するか否か */
  isPlayDisabled    : boolean;
  /** 計算ボタン押下時に前回のプレイ結果表示を消去するイベント */
  onStartCalculation: () => void;
  /** 配当ありの役で獲得したコインをダブルアップに引き渡すイベント */
  onWin             : (coins: number) => void;
  /** 不成立またはワンペアで新規プレイに戻すイベント */
  onNoPayout        : () => void;
};

/** 配当がありダブルアップに進める役の選択肢 */
const payoutHandCategories: Array<HandCategory> = [
  'twoPair',
  'threeCard',
  'straight',
  'flush',
  'fullHouse',
  'fourCard',
  'straightFlush',
  'fiveCard',
  'royalFlush'
];

/** 計算結果とゲーム上の役名を対応付ける表示名 */
const handCategoryDisplayNames: Record<HandCategory, string> = {
  none         : '不成立',
  onePair      : 'ワンペア (獲得コインなし)',
  twoPair      : 'ツーペア',
  threeCard    : 'スリーカード',
  straight     : 'ストレート',
  flush        : 'フラッシュ',
  fullHouse    : 'フルハウス',
  fourCard     : 'フォーカード',
  straightFlush: 'ストレートフラッシュ',
  fiveCard     : 'ファイブカード',
  royalFlush   : 'ロイヤルフラッシュ'
};

/** トランプカード1枚分の未選択状態を生成する */
const createEmptyPlayingCardSelection  = (): PlayingCardSelection        => ({ suit: null, rank: null, isJoker: false });
/** 交換前の手札5枚分の未選択状態を生成する */
const createEmptyPlayingCardSelections = (): Array<PlayingCardSelection> => Array.from({ length: 5 }, createEmptyPlayingCardSelection);

/** 入力途中の値を確定済みポーカー用トランプカードに変換する・未確定なら `null` */
const toPokerPlayingCard = (playingCardSelection: PlayingCardSelection): PokerPlayingCard | null => {
  if(playingCardSelection.isJoker) return { suit: 'joker' };
  if(playingCardSelection.suit == null || playingCardSelection.rank == null) return null;
  return { suit: playingCardSelection.suit, rank: playingCardSelection.rank };
};

/** ポーカー用トランプカードを重複判定用のキーに変換する */
const pokerPlayingCardKey = (pokerPlayingCard: PokerPlayingCard): string => pokerPlayingCard.suit === 'joker' ? 'joker' : `${pokerPlayingCard.suit}-${pokerPlayingCard.rank}`;

/** ポーカーの初期手札入力、保持推奨計算、交換後に成立した役の入力を扱う */
export const PokerSection = ({ isPlayDisabled, onStartCalculation, onWin, onNoPayout }: PokerSectionProps): ReactElement => {
  /** 役判定、配当計算、全保持パターンの期待値計算を担当する Service */
  const pokerService = new PokerService();
  
  const [playingCardSelections, setPlayingCardSelections] = useState<Array<PlayingCardSelection>>(createEmptyPlayingCardSelections());  // 交換前の5枚・入力途中の値を含む
  const [calculationMode      , setCalculationMode      ] = useState<CalculationMode>('shortcut');                               // 保持推奨の計算方法
  const [holdOptions          , setHoldOptions          ] = useState<Array<HoldOption>>([]);                                     // EV 降順の保持32パターン
  const [isCalculating        , setIsCalculating        ] = useState<boolean>(false);                                            // 保持推奨を計算中か否か
  const [calculationError     , setCalculationError     ] = useState<string>('');                                                // 手札入力・保持推奨計算のエラー
  const [calculationDuration  , setCalculationDuration  ] = useState<number | null>(null);                                       // 保持推奨の計算処理にかかったミリ秒・未計算なら `null`
  
  /** 入力中の5枠を確定済みポーカー用トランプカードまたは `null` に変換した値 */
  const pokerPlayingCards = playingCardSelections.map(toPokerPlayingCard);
  /** 5枠全てでジョーカーまたはスート・ランクが確定しているか否か */
  const isPokerPlayingCardHandComplete = pokerPlayingCards.every((pokerPlayingCard): pokerPlayingCard is PokerPlayingCard => pokerPlayingCard != null);
  /** 完成した場合のみ Service に渡せる交換前のトランプカード5枚 */
  const dealtPokerPlayingCards = isPokerPlayingCardHandComplete ? pokerPlayingCards : [];
  /** 同じトランプカードまたは複数のジョーカーを検出するためのキー */
  const dealtPokerPlayingCardKeys = dealtPokerPlayingCards.map(pokerPlayingCardKey);
  /** 入力した5枚にデッキ上存在しない重複があるか否か */
  const hasDuplicatePlayingCard = new Set(dealtPokerPlayingCardKeys).size !== dealtPokerPlayingCardKeys.length;
  /** 入力完了かつ重複がない場合に参考表示する交換前の役 */
  const initialHandCategory = isPokerPlayingCardHandComplete && !hasDuplicatePlayingCard ? pokerService.evaluateHand(dealtPokerPlayingCards) : null;
  /** EV が最大となる先頭の保持パターン・未計算なら `null` */
  const bestHoldOption = holdOptions[0] ?? null;
  
  /** 指定位置のカード入力を更新し、以前の計算結果を無効化する */
  const onChangePlayingCard = (playingCardIndex: number, playingCardSelection: PlayingCardSelection): void => {
    setPlayingCardSelections(currentPlayingCardSelections => currentPlayingCardSelections.map((currentPlayingCardSelection, currentPlayingCardIndex) => currentPlayingCardIndex === playingCardIndex ? playingCardSelection : currentPlayingCardSelection));
    setHoldOptions([]);
    setCalculationError('');
    setCalculationDuration(null);
  };
  
  /** 計算モードを変更し、以前の計算結果を無効化する */
  const onChangeCalculationMode = (event: ChangeEvent<HTMLSelectElement>): void => {
    setCalculationMode(event.target.value as CalculationMode);
    setHoldOptions([]);
    setCalculationDuration(null);
  };
  
  /** 入力済み手札の全32保持パターンを計算する */
  const onCalculateHoldOptions = (): void => {
    onStartCalculation();
    if(!isPokerPlayingCardHandComplete) return setCalculationError('5枚全てのスートとランクを入力してください');
    if(hasDuplicatePlayingCard) return setCalculationError('同じトランプカードまたはジョーカーを重複して入力することはできません');
    
    setCalculationError('');
    setCalculationDuration(null);
    setIsCalculating(true);
    window.setTimeout(() => {
      /** タイマー待機を除いた期待値計算自体の処理時間を測る開始時刻 */
      const calculationStartedAt = window.performance.now();
      try {
        setHoldOptions(pokerService.evaluateAllHoldOptions(dealtPokerPlayingCards, { mode: calculationMode }));
      }
      catch(error) {
        setCalculationError(error instanceof Error ? error.message : '保持推奨の計算に失敗しました');
      }
      finally {
        setCalculationDuration(window.performance.now() - calculationStartedAt);
        setIsCalculating(false);
      }
    }, 0);
  };
  
  /** ゲーム画面に表示された配当ありの成立役を選択した時点でダブルアップに進む */
  const onChangeResultCategory = (event: ChangeEvent<HTMLSelectElement>): void => {
    if(isEmpty(event.target.value)) return;
    onWin(pokerService.calculatePayout(event.target.value as HandCategory));
  };
  
  return (
    <section>
      <h2 className="mb-2 text-xl font-bold">ポーカー</h2>
      
      {isPlayDisabled && (
        <div className="alert alert-warning alert-soft mb-4">本日の獲得コインが20,000枚を超えているため、新しいプレイは開始できません</div>
      )}
      
      <div className="text-base-content/60 mb-2 text-sm">最初に配られた5枚を入力してください。</div>
      <div className="overflow-x-auto mb-4">
        <div className="flex gap-1">
          {playingCardSelections.map((playingCardSelection, playingCardIndex) => (
            <div key={playingCardIndex}>
              <PlayingCardInput
                label={`${playingCardIndex + 1}枚目`}
                playingCardSelection={playingCardSelection}
                isDisabled={isPlayDisabled || isCalculating}
                isJokerShown
                onChangePlayingCardSelection={changedPlayingCardSelection => onChangePlayingCard(playingCardIndex, changedPlayingCardSelection)}
              />
              <div className="min-h-7 place-content-end text-center">
                {bestHoldOption?.heldPlayingCardIndices.includes(playingCardIndex) && (
                  <span className="badge badge-success">保持すべき</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {initialHandCategory != null && (
        <div className="alert alert-info alert-soft mb-4">交換前の役 : {handCategoryDisplayNames[initialHandCategory]}</div>
      )}
      
      <div className="flex gap-2 mb-4">
        <select className="select select-sm min-w-50" value={calculationMode} onChange={onChangeCalculationMode} disabled={isPlayDisabled || isCalculating}>
          <option value="shortcut">ショートカット計算</option>
          <option value="exact">厳密 EV 計算</option>
        </select>
        <button type="button" className="btn btn-sm btn-info" onClick={onCalculateHoldOptions} disabled={isPlayDisabled || isCalculating}>計算する</button>
      </div>
      
      {calculationMode === 'exact' && (
        <div className="alert alert-warning alert-soft mb-4">厳密 EV 計算は完了まで十数秒かかる場合があります。</div>
      )}
      
      {!isEmpty(calculationError) && (
        <div className="alert alert-error alert-soft mb-4">{calculationError}</div>
      )}
      
      {holdOptions.length > 0 && (
        <>
          <details className="mb-4 border border-base-300 rounded-box">
            <summary className="py-2 px-3 font-bold text-sm cursor-pointer">
              全パターンの計算結果
              {calculationDuration != null && (<span className="text-base-content/60 font-normal text-xs"> (計算時間 : {(calculationDuration / 1000).toFixed(3)}秒)</span>)}
            </summary>
            
            <div className="overflow-x-auto px-3">
              <table className="table table-xs">
                <thead>
                  <tr className="[&>th]:px-1 [&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                    <th>順位</th>
                    <th>保持するカード</th>
                    <th className="text-right">交換枚数</th>
                    <th className="text-right">期待コイン</th>
                    <th>期待倍率</th>
                    <th>計算方法</th>
                  </tr>
                </thead>
                <tbody>
                  {holdOptions.map((holdOption, holdOptionIndex) => (
                    <tr key={holdOption.holdMask} className={`[&>td]:px-1 [&>td]:align-top ${holdOptionIndex === 0 ? 'bg-success/10 font-bold' : ''}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                      <td className="w-px text-right whitespace-nowrap">{holdOptionIndex + 1}</td>
                      <td                                              >{holdOption.heldPlayingCardIndices.length === 0 ? 'なし' : holdOption.heldPlayingCardIndices.map(heldPlayingCardIndex => `${heldPlayingCardIndex + 1}`).join('・') + '枚目'}</td>
                      <td className="w-px text-right whitespace-nowrap">{holdOption.discardCount}枚</td>
                      <td className="w-px text-right whitespace-nowrap">{holdOption.expectedValue.toFixed(1)}枚</td>
                      <td className="w-px            whitespace-nowrap">×{holdOption.expectedMultiplier.toFixed(3)}</td>
                      <td className="w-px            whitespace-nowrap">{holdOption.resultType === 'exact' ? `厳密 (${holdOption.sampleSize.toLocaleString()}通り)` : `推定 (${holdOption.sampleSize.toLocaleString()}回)`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          
          <h3 className="mb-2 text-lg font-bold">交換後の結果</h3>
          <p className="text-base-content/60 mb-2 text-sm">成立した役を選択してください。</p>
          <div className="flex gap-2 mb-4">
            <select className="select select-sm min-w-50" defaultValue="" onChange={onChangeResultCategory}>
              <option value="">選択してください</option>
              {payoutHandCategories.map(payoutHandCategory => (
                <option key={payoutHandCategory} value={payoutHandCategory}>{handCategoryDisplayNames[payoutHandCategory]}</option>
              ))}
            </select>
            <button type="button" className="btn btn-sm btn-outline" onClick={onNoPayout}>不成立 (ワンペア)</button>
          </div>
        </>
      )}
    </section>
  );
};

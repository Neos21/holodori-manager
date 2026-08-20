import { type ChangeEvent, type ReactElement, useState } from 'react';

import { PlayingCardInput, type PlayingCardSelection } from './playing-card-input';
import { PokerService } from '../services/poker-service';

import type { CalculationMode, HandCategory, HoldOption, PokerCard } from '../types/poker-types';

type PokerSectionProps = {
  isPlayDisabled: boolean;
  onWin         : (coins: number) => void;
  onNoPayout    : () => void;
};

const handCategories: Array<HandCategory> = [
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

const createEmptyPlayingCardSelection = (): PlayingCardSelection        => ({ suit: null, rank: null, isJoker: false });
const createEmptyHandSelections       = (): Array<PlayingCardSelection> => Array.from({ length: 5 }, createEmptyPlayingCardSelection);

/** 入力途中の値を確定済みポーカーカードへ変換する・未確定なら `null` */
const toPokerCard = (playingCardSelection: PlayingCardSelection): PokerCard | null => {
  if(playingCardSelection.isJoker) return { suit: 'joker' };
  if(playingCardSelection.suit == null || playingCardSelection.rank == null) return null;
  return { suit: playingCardSelection.suit, rank: playingCardSelection.rank };
};

/** カードを重複判定用のキーへ変換する */
const pokerCardKey = (pokerCard: PokerCard): string => pokerCard.suit === 'joker' ? 'joker' : `${pokerCard.suit}-${pokerCard.rank}`;

/** ポーカーの初期手札入力、保持推奨計算、交換後に成立した役の入力を扱う */
export const PokerSection = ({ isPlayDisabled, onWin, onNoPayout }: PokerSectionProps): ReactElement => {
  const pokerService = new PokerService();
  
  const [playingCardSelections, setPlayingCardSelections] = useState<Array<PlayingCardSelection>>(createEmptyHandSelections());  // 交換前の5枚・入力途中の値を含む
  const [calculationMode      , setCalculationMode      ] = useState<CalculationMode>('shortcut');                               // 保持推奨の計算方法
  const [holdOptions          , setHoldOptions          ] = useState<Array<HoldOption>>([]);                                     // EV 降順の保持32パターン
  const [isCalculating        , setIsCalculating        ] = useState<boolean>(false);                                            // 保持推奨を計算中か否か
  const [calculationError     , setCalculationError     ] = useState<string>('');                                                // 手札入力・保持推奨計算のエラー
  const [calculationDuration  , setCalculationDuration  ] = useState<number | null>(null);                                       // 保持推奨の計算処理にかかったミリ秒・未計算なら `null`
  
  const convertedCards = playingCardSelections.map(toPokerCard);
  const isHandComplete = convertedCards.every((pokerCard): pokerCard is PokerCard => pokerCard != null);
  const dealtHand = isHandComplete ? convertedCards : [];
  const dealtPlayingCardKeys = dealtHand.map(pokerCardKey);
  const hasDuplicateCard = new Set(dealtPlayingCardKeys).size !== dealtPlayingCardKeys.length;
  const initialHandCategory = isHandComplete && !hasDuplicateCard ? pokerService.evaluateHand(dealtHand) : null;
  const bestHoldOption = holdOptions[0] ?? null;
  
  /** 指定位置のカード入力を更新し、以前の計算結果を無効化する */
  const onChangePlayingCard = (playingCardIndex: number, playingCardSelection: PlayingCardSelection): void => {
    setPlayingCardSelections(currentSelections => currentSelections.map((currentSelection, currentIndex) => currentIndex === playingCardIndex ? playingCardSelection : currentSelection));
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
    if(!isHandComplete) return setCalculationError('5枚全てのスートとランクを入力してください');
    if(hasDuplicateCard) return setCalculationError('同じカードまたはジョーカーを重複して入力することはできません');
    
    setCalculationError('');
    setCalculationDuration(null);
    setIsCalculating(true);
    window.setTimeout(() => {
      const calculationStartedAt = window.performance.now();
      try {
        setHoldOptions(pokerService.evaluateAllHoldOptions(dealtHand, { mode: calculationMode }));
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
  
  /** ゲーム画面に表示された配当ありの成立役を選択した時点でダブルアップへ進む */
  const onChangeResultCategory = (event: ChangeEvent<HTMLSelectElement>): void => {
    if(event.target.value === '') return;
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
                value={playingCardSelection}
                isDisabled={isPlayDisabled || isCalculating}
                isJokerShown
                onChange={value => onChangePlayingCard(playingCardIndex, value)}
              />
              <div className="min-h-7 place-content-end text-center">
                {bestHoldOption?.heldIndices.includes(playingCardIndex) && (
                  <span className="badge badge-success">保持すべき</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {initialHandCategory != null && (
        <div className="alert alert-info alert-soft mb-4">交換前の役：{handCategoryDisplayNames[initialHandCategory]}</div>
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
      
      {calculationError !== '' && (
        <div className="alert alert-error alert-soft mb-4">{calculationError}</div>
      )}
      
      {holdOptions.length > 0 && (
        <>
          <details className="mb-4 border border-base-300 rounded-box">
            <summary className="py-2 px-3 font-bold text-sm cursor-pointer">
              全パターンの計算結果
              {calculationDuration != null && (<span className="font-normal text-xs"> (計算時間 : {(calculationDuration / 1000).toFixed(3)}秒)</span>)}
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
                  {holdOptions.map((holdOption, optionIndex) => (
                    <tr key={holdOption.holdMask} className={`[&>td]:px-1 [&>td]:align-top ${optionIndex === 0 ? 'bg-success/10 font-bold' : ''}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                      <td className="w-px text-right whitespace-nowrap">{optionIndex + 1}</td>
                      <td>{holdOption.heldIndices.length === 0 ? 'なし' : holdOption.heldIndices.map(index => `${index + 1}`).join('・') + '枚目'}</td>
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
              {handCategories.map(handCategory => (
                <option key={handCategory} value={handCategory}>{handCategoryDisplayNames[handCategory]}</option>
              ))}
            </select>
            <button type="button" className="btn btn-sm btn-outline" onClick={onNoPayout}>不成立 (ワンペア)</button>
          </div>
        </>
      )}
    </section>
  );
};

import { type ChangeEvent, type ReactElement, useState } from 'react';

import { DoubleUpSection } from './components/double-up-section';
import { PokerSection } from './components/poker-section';
import { betCoinsPerPlay, dailyCoinCap } from './constants/high-and-low-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';

/** ゲーム段階を定義する */
type GamePhase = 'poker' | 'double-up';

/** 手動編集可能なコイン入力を計算に使用する0以上の整数へ変換する */
const parseCoinInput = (coinInput: string): number => {
  const parsedCoins = Number(coinInput);
  return Number.isFinite(parsedCoins) && parsedCoins >= 0 ? Math.floor(parsedCoins) : 0;
};

/** High & Low の保持推奨とダブルアップ判断を計算するページ */
export default function HighAndLowCalculatorPage(): ReactElement {
  const [remainingBalanceCoinsInput, setRemainingBalanceCoinsInput] = useState<string>('0');         // 現在の所持金・手動修正を許可する入力値
  const [todayEarnedCoinsInput     , setTodayEarnedCoinsInput     ] = useState<string>('0');         // 本日の確定済み獲得コイン・手動修正を許可する入力値
  const [todayBetCoinsInput        , setTodayBetCoinsInput        ] = useState<string>('0');         // 本日のベット累計・手動修正を許可する入力値
  const [gamePhase                 , setGamePhase                 ] = useState<GamePhase>('poker');  // 現在入力中のゲーム段階
  const [doubleUpCoins             , setDoubleUpCoins             ] = useState<number>(0);           // ダブルアップ開始時の獲得コイン
  const [playKey                   , setPlayKey                   ] = useState<number>(0);           // 新規プレイに戻る際にポーカー内部 State を初期化するキー
  const [resultMessage             , setResultMessage             ] = useState<string>('');          // 直前に確定したプレイ結果
  
  /** 空文字や負数などを 0 として扱い、小数を切り捨てた現在の所持金 */
  const remainingBalanceCoins = parseCoinInput(remainingBalanceCoinsInput);
  /** 空文字や負数などを 0 として扱い、小数を切り捨てた本日の確定済み獲得コイン */
  const todayEarnedCoins = parseCoinInput(todayEarnedCoinsInput);
  /** 空文字や負数などを 0 として扱い、小数を切り捨てた本日のベット累計 */
  const todayBetCoins = parseCoinInput(todayBetCoinsInput);
  /** 確定済みの獲得コインからベット累計を差し引いた本日の収支 */
  const todayNetCoins = todayEarnedCoins - todayBetCoins;
  /** ベット累計から導出した本日のプレイ回数 */
  const todayPlayCount = Math.floor(todayBetCoins / betCoinsPerPlay);
  /** 手動入力したベット累計が1プレイ分のベット単位と一致していないか否か */
  const hasInvalidTodayBetCoins = todayBetCoins % betCoinsPerPlay !== 0;
  /** 日次上限または所持金不足により新しいポーカーを開始できない理由・開始できる場合は空文字 */
  const newPlayDisabledReason = todayEarnedCoins > dailyCoinCap
    ? `本日の獲得コインが${dailyCoinCap.toLocaleString()}枚を超えているため、新しいプレイは開始できません`
    : remainingBalanceCoins < betCoinsPerPlay
      ? `現在の所持金がベットに必要な${betCoinsPerPlay}枚を下回っているため、新しいプレイは開始できません`
      : '';
  /** 日次上限または所持金不足により新しいポーカーを開始できないか否か */
  const isNewPlayDisabled = !isEmpty(newPlayDisabledReason);
  
  /** 現在の所持金入力を更新する */
  const onChangeRemainingBalanceCoins = (event: ChangeEvent<HTMLInputElement>): void => setRemainingBalanceCoinsInput(event.target.value);
  /** 本日の獲得済みコイン入力を更新する */
  const onChangeTodayEarnedCoins = (event: ChangeEvent<HTMLInputElement>): void => setTodayEarnedCoinsInput(event.target.value);
  /** 本日のベット累計入力を更新する */
  const onChangeTodayBetCoins = (event: ChangeEvent<HTMLInputElement>): void => setTodayBetCoinsInput(event.target.value);
  
  /** 新しいプレイの開始時に所持金からベットを支払い、本日のベット累計へ加算する */
  const onStartPokerPlay = (): boolean => {
    if(isNewPlayDisabled) return false;
    setRemainingBalanceCoinsInput(String(remainingBalanceCoins - betCoinsPerPlay));
    setTodayBetCoinsInput(String(todayBetCoins + betCoinsPerPlay));
    setResultMessage('');
    return true;
  };
  
  /** 新しい保持推奨計算を始める際に直前のプレイ結果表示を消去する */
  const onStartPokerCalculation = (): void => setResultMessage('');
  
  /** 配当のある役が成立したら、その獲得コインでダブルアップ段階に進む */
  const onPokerWin = (pokerPayoutCoins: number): void => {
    setDoubleUpCoins(pokerPayoutCoins);
    setGamePhase('double-up');
    setResultMessage('');
  };
  
  /** 配当なしでポーカーが終了したら新規プレイ入力に戻る */
  const onPokerNoPayout = (): void => {
    setPlayKey(currentPlayKey => currentPlayKey + 1);
    setResultMessage('役不成立またはワンペアのため、獲得コインはありませんでした');
  };
  
  /** ダブルアップを終了し、確定したコインを本日の累計に加算して新規プレイ入力に戻る */
  const onDoubleUpCollect = (collectedCoins: number, isForced: boolean): void => {
    /** 今回確定したコインを加算した後の本日累計 */
    const nextTodayEarnedCoins = todayEarnedCoins + collectedCoins;
    /** 今回確定したコインを加算した後の所持金 */
    const nextRemainingBalanceCoins = remainingBalanceCoins + collectedCoins;
    setTodayEarnedCoinsInput(String(nextTodayEarnedCoins));
    setRemainingBalanceCoinsInput(String(nextRemainingBalanceCoins));
    setGamePhase('poker');
    setPlayKey(currentPlayKey => currentPlayKey + 1);
    setResultMessage(isForced
      ? `1プレイの上限を超えたため、${collectedCoins.toLocaleString()}枚で自動確定しました`
      : `${collectedCoins.toLocaleString()}枚で辞退し、本日の獲得コインに加算しました`);
  };
  
  /** ダブルアップ失敗を反映し、コインを加算せず新規プレイ入力に戻る */
  const onDoubleUpLose = (): void => {
    setGamePhase('poker');
    setPlayKey(currentPlayKey => currentPlayKey + 1);
    setResultMessage('ダブルアップに失敗したため、このプレイの獲得コインは0枚です');
  };
  
  return (
    <main>
      <h1>High & Low</h1>
      
      <div className="mb-2 grid grid-cols-[max-content_8rem] items-center gap-2">
        <label className="text-sm whitespace-nowrap">現在の所持金</label>
        <input
          type="number" className="input text-right input-xs"
          value={remainingBalanceCoinsInput} onChange={onChangeRemainingBalanceCoins}
          min="0" step="1"
        />
        
        <label className="text-sm whitespace-nowrap">今日稼いだコイン</label>
        <input
          type="number" className="input text-right input-xs"
          value={todayEarnedCoinsInput} onChange={onChangeTodayEarnedCoins}
          min="0" step="1"
        />
        
        <label className="text-sm whitespace-nowrap">今日のベット累計</label>
        <input
          type="number" className="input text-right input-xs"
          value={todayBetCoinsInput} onChange={onChangeTodayBetCoins}
          min="0" step={betCoinsPerPlay}
        />
      </div>
      
      <p className="mb-2 text-xs text-base-content/60">最初のカードまたは結果を入力すると、所持金から50枚を差し引いてベット累計に加算します。途中から使う場合は各値を手動で修正できます。</p>
      
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <span className="badge badge-outline">今日のプレイ : {todayPlayCount.toLocaleString()}回</span>
        <span className={`badge badge-outline ${todayNetCoins >= 0 ? 'text-success' : 'text-error'}`}>今日の収支 : {todayNetCoins.toLocaleString()}枚</span>
      </div>
      
      {hasInvalidTodayBetCoins && (
        <div className="mb-4 alert alert-soft alert-warning">ベット累計が1プレイ50枚の単位と一致していません。入力値はそのまま収支計算に使用します。</div>
      )}
      
      {!isEmpty(resultMessage) && (
        <div className="mb-4 alert alert-soft alert-info">{resultMessage}</div>
      )}
      
      {gamePhase === 'poker' ? (
        <PokerSection
          key={playKey}
          isPlayDisabled={isNewPlayDisabled}
          playDisabledReason={newPlayDisabledReason}
          onStartPlay={onStartPokerPlay}
          onStartCalculation={onStartPokerCalculation}
          onWin={onPokerWin}
          onNoPayout={onPokerNoPayout}
        />
      ) : (
        <DoubleUpSection
          initialCoins={doubleUpCoins}
          remainingBalanceCoins={remainingBalanceCoins}
          todayEarnedCoins={todayEarnedCoins}
          todayBetCoins={todayBetCoins}
          onCollect={onDoubleUpCollect}
          onLose={onDoubleUpLose}
        />
      )}
    </main>
  );
}

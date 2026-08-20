import { type ChangeEvent, type ReactElement, useState } from 'react';

import { DoubleUpSection } from './components/double-up-section';
import { PokerSection } from './components/poker-section';
import { isEmpty } from '../../../shared/helpers/is-empty';

/** ゲーム段階を定義する */
type GamePhase = 'poker' | 'double-up';

/** 1日あたりの累計獲得コイン上限 */
const dailyCoinCap = 20_000;

/** High & Low の保持推奨とダブルアップ判断を計算するページ */
export default function HighAndLowCalculatorPage(): ReactElement {
  const [todayEarnedCoinsInput, setTodayEarnedCoinsInput] = useState<string>('0');         // 本日の確定済み獲得コイン・手動修正を許可する入力値
  const [gamePhase            , setGamePhase            ] = useState<GamePhase>('poker');  // 現在入力中のゲーム段階
  const [doubleUpCoins        , setDoubleUpCoins        ] = useState<number>(0);           // ダブルアップ開始時の獲得コイン
  const [playKey              , setPlayKey              ] = useState<number>(0);           // 新規プレイに戻る際にポーカー内部 State を初期化するキー
  const [resultMessage        , setResultMessage        ] = useState<string>('');          // 直前に確定したプレイ結果
  
  /** 手動編集可能な入力文字列を日次上限判定と自動加算に使用する数値に変換した値 */
  const parsedTodayEarnedCoins = Number(todayEarnedCoinsInput);
  /** 空文字や負数などを0として扱い、小数を切り捨てた本日の確定済み獲得コイン */
  const todayEarnedCoins = Number.isFinite(parsedTodayEarnedCoins) && parsedTodayEarnedCoins >= 0 ? Math.floor(parsedTodayEarnedCoins) : 0;
  /** 本日の確定済みコインが上限を超え、新しいポーカーを開始できないか否か */
  const isNewPlayDisabled = todayEarnedCoins > dailyCoinCap;
  
  /** 本日の獲得済みコイン入力を更新する */
  const onChangeTodayEarnedCoins = (event: ChangeEvent<HTMLInputElement>): void => setTodayEarnedCoinsInput(event.target.value);
  
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
    setTodayEarnedCoinsInput(String(nextTodayEarnedCoins));
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
      
      <fieldset className="flex gap-2 mb-1">
        <label className="fieldset-label text-sm whitespace-nowrap">今日稼いだコイン</label>
        <input
          type="number" className="input input-xs w-30 text-right"
          value={todayEarnedCoinsInput} onChange={onChangeTodayEarnedCoins}
          min="0" step="1"
        />
      </fieldset>
      <p className="text-base-content/60 mb-4 text-xs">プレイ結果の確定時に自動加算されます。途中から使う場合は手動で修正できます。</p>
      
      {!isEmpty(resultMessage) && (
        <div className="alert alert-info alert-soft mb-4">{resultMessage}</div>
      )}
      
      {gamePhase === 'poker' ? (
        <PokerSection
          key={playKey}
          isPlayDisabled={isNewPlayDisabled}
          onStartCalculation={onStartPokerCalculation}
          onWin={onPokerWin}
          onNoPayout={onPokerNoPayout}
        />
      ) : (
        <DoubleUpSection
          initialCoins={doubleUpCoins}
          onCollect={onDoubleUpCollect}
          onLose={onDoubleUpLose}
        />
      )}
    </main>
  );
}

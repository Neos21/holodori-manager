import { type ChangeEvent, type ReactElement, useState } from 'react';

import { DoubleUpSection } from './components/double-up-section';
import { PokerSection } from './components/poker-section';

/** ゲーム段階を定義する */
type GamePhase = 'poker' | 'double-up';

/** 1日あたりの累計獲得コイン上限 */
const dailyCoinCap = 20_000;

/** High & Low の保持推奨とダブルアップ判断を計算するページ */
export default function HighAndLowCalculatorPage(): ReactElement {
  const [todayEarnedCoinsInput, setTodayEarnedCoinsInput] = useState<string>('0');         // 本日の確定済み獲得コイン・手動修正を許可する入力値
  const [gamePhase            , setGamePhase            ] = useState<GamePhase>('poker');  // 現在入力中のゲーム段階
  const [doubleUpCoins        , setDoubleUpCoins        ] = useState<number>(0);           // ダブルアップ開始時の獲得コイン
  const [playKey              , setPlayKey              ] = useState<number>(0);           // 新規プレイへ戻る際にポーカー内部 State を初期化するキー
  const [resultMessage        , setResultMessage        ] = useState<string>('');          // 直前に確定したプレイ結果
  
  const parsedTodayEarnedCoins = Number(todayEarnedCoinsInput);
  const todayEarnedCoins = Number.isFinite(parsedTodayEarnedCoins) && parsedTodayEarnedCoins >= 0 ? Math.floor(parsedTodayEarnedCoins) : 0;
  const isNewPlayDisabled = todayEarnedCoins > dailyCoinCap;
  
  /** 本日の獲得済みコイン入力を更新する */
  const onChangeTodayEarnedCoins = (event: ChangeEvent<HTMLInputElement>): void => setTodayEarnedCoinsInput(event.target.value);
  
  /** 配当のある役が成立したら、その獲得コインでダブルアップ段階へ進む */
  const onPokerWin = (coins: number): void => {
    setDoubleUpCoins(coins);
    setGamePhase('double-up');
    setResultMessage('');
  };
  
  /** 配当なしでポーカーが終了したら新規プレイ入力へ戻る */
  const onPokerNoPayout = (): void => {
    setPlayKey(currentPlayKey => currentPlayKey + 1);
    setResultMessage('役不成立またはワンペアのため、獲得コインはありませんでした');
  };
  
  /** ダブルアップを終了し、確定したコインを本日の累計へ加算して新規プレイ入力へ戻る */
  const onDoubleUpCollect = (coins: number, isForced: boolean): void => {
    const nextTodayEarnedCoins = todayEarnedCoins + coins;
    setTodayEarnedCoinsInput(String(nextTodayEarnedCoins));
    setGamePhase('poker');
    setPlayKey(currentPlayKey => currentPlayKey + 1);
    setResultMessage(isForced
      ? `1プレイの上限を超えたため、${coins.toLocaleString()}枚で自動確定しました`
      : `${coins.toLocaleString()}枚で辞退し、本日の獲得コインへ加算しました`);
  };
  
  /** ダブルアップ失敗を反映し、コインを加算せず新規プレイ入力へ戻る */
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
      
      {resultMessage !== '' && (
        <div className="alert alert-info alert-soft mb-4">{resultMessage}</div>
      )}
      
      {gamePhase === 'poker' ? (
        <PokerSection key={playKey} isPlayDisabled={isNewPlayDisabled} onWin={onPokerWin} onNoPayout={onPokerNoPayout} />
      ) : (
        <DoubleUpSection initialCoins={doubleUpCoins} onCollect={onDoubleUpCollect} onLose={onDoubleUpLose} />
      )}
    </main>
  );
}

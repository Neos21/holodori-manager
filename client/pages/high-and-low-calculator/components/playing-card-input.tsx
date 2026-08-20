import { type ReactElement } from 'react';

import type { Rank, Suit } from '../types/playing-card-types';

/** トランプカード1枚分の入力途中の値・ジョーカーまたはスートとランクの両方が揃うと確定する */
export type PlayingCardSelection = {
  /** 選択中のスート・未選択またはジョーカーなら `null` */
  suit   : Suit | null;
  /** 選択中のランク・未選択またはジョーカーなら `null` */
  rank   : Rank | null;
  /** ジョーカーを選択中か否か */
  isJoker: boolean;
};

/** トランプカード1枚分の入力欄に渡す表示状態とイベント */
type PlayingCardInputProps = {
  /** 何枚目または提示分かを示す入力欄見出し */
  label                       : string;
  /** スート・ランク・ジョーカーの現在の選択状態 */
  playingCardSelection        : PlayingCardSelection;
  /** 全ての選択ボタンを操作不可にするか否か */
  isDisabled                 ?: boolean;
  /** ランク選択肢の末尾にジョーカーを表示するか否か */
  isJokerShown               ?: boolean;
  /** 選択状態が変化した際に入力途中の値を通知するイベント */
  onChangePlayingCardSelection: (playingCardSelection: PlayingCardSelection) => void;
};

/** スート選択ボタン1件分の値と表示設定 */
type PlayingCardSuitOption = {
  /** 選択時に入力値に設定するスート */
  value    : Suit;
  /** ボタンに表示するスート記号 */
  label    : string;
  /** 赤スートと黒スートを区別する文字色 */
  className: string;
};

/** ランク選択ボタン1件分の値と表示設定 */
type PlayingCardRankOption = {
  /** 選択時に入力値に設定するランク */
  value: Rank;
  /** J・Q・K・A を含むゲーム上のランク表記 */
  label: string;
};

/** コントラクトブリッジ (スーツの強い順) */
const playingCardSuitOptions: Array<PlayingCardSuitOption> = [
  { value: 'spade'  , label: '♠', className: 'text-base-content' },
  { value: 'heart'  , label: '♥', className: 'text-error'        },
  { value: 'diamond', label: '♦', className: 'text-error'        },
  { value: 'club'   , label: '♣', className: 'text-base-content' }
];

/** ゲーム内と同じ昇順で表示するランク選択肢 */
const playingCardRankOptions: Array<PlayingCardRankOption> = [
  { value: 2 , label: '2'  },
  { value: 3 , label: '3'  },
  { value: 4 , label: '4'  },
  { value: 5 , label: '5'  },
  { value: 6 , label: '6'  },
  { value: 7 , label: '7'  },
  { value: 8 , label: '8'  },
  { value: 9 , label: '9'  },
  { value: 10, label: '10' },
  { value: 11, label: 'J'  },
  { value: 12, label: 'Q'  },
  { value: 13, label: 'K'  },
  { value: 14, label: 'A'  }
];

/** スートとランクを常時表示してトランプカード1枚を入力する */
export const PlayingCardInput = ({ label, playingCardSelection, isDisabled = false, isJokerShown = false, onChangePlayingCardSelection }: PlayingCardInputProps): ReactElement => {
  /** 通常のトランプカードのスートを選択し、ジョーカー選択を解除する */
  const onSelectSuit = (suit: Suit): void => onChangePlayingCardSelection({ suit, rank: playingCardSelection.rank, isJoker: false });
  /** 通常のトランプカードのランクを選択し、ジョーカー選択を解除する */
  const onSelectRank = (rank: Rank): void => onChangePlayingCardSelection({ suit: playingCardSelection.suit, rank, isJoker: false });
  /** ジョーカーを選択する */
  const onSelectJoker = (): void => onChangePlayingCardSelection({ suit: null, rank: null, isJoker: true });
  
  return (
    <fieldset className="rounded-box border border-base-300 pt-0 px-1 pb-2 min-w-38">
      <legend className="px-1 font-bold text-sm">{label}</legend>
      
      <div className="grid grid-cols-4 mb-1">
        {playingCardSuitOptions.map(playingCardSuitOption => (
          <button
            key={playingCardSuitOption.value} type="button"
            className={`btn btn-sm px-0 text-lg ${playingCardSelection.isJoker === false && playingCardSelection.suit === playingCardSuitOption.value ? 'btn-info' : 'btn-ghost'} ${playingCardSuitOption.className}`}
            onClick={() => onSelectSuit(playingCardSuitOption.value)} disabled={isDisabled}
          >
            {playingCardSuitOption.label}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-7">
        {playingCardRankOptions.map(playingCardRankOption => (
          <button
            key={playingCardRankOption.value} type="button"
            className={`btn btn-xs p-0 ${playingCardSelection.isJoker === false && playingCardSelection.rank === playingCardRankOption.value ? 'btn-info' : 'btn-ghost'}`}
            onClick={() => onSelectRank(playingCardRankOption.value)} disabled={isDisabled}
          >
            {playingCardRankOption.label}
          </button>
        ))}
        {isJokerShown && (
          <button
            type="button"
            className={`btn btn-xs p-0 ${playingCardSelection.isJoker ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={onSelectJoker} disabled={isDisabled}
          >
            🎃
          </button>
        )}
      </div>
    </fieldset>
  );
};

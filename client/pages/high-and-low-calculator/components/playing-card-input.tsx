import { type ReactElement } from 'react';

import type { Rank, Suit } from '../types/playing-card-types';

/** カード1枚分の入力途中の値・ジョーカーまたはスートとランクの両方が揃うと確定する */
export type PlayingCardSelection = {
  suit   : Suit | null;
  rank   : Rank | null;
  isJoker: boolean;
};

type PlayingCardInputProps = {
  label        : string;
  value        : PlayingCardSelection;
  isDisabled  ?: boolean;
  isJokerShown?: boolean;
  onChange     : (value: PlayingCardSelection) => void;
};

/** コントラクトブリッジ (スーツの強い順) */
const suits: Array<{ value: Suit; label: string; className: string }> = [
  { value: 'spade'  , label: '♠', className: 'text-base-content' },
  { value: 'heart'  , label: '♥', className: 'text-error'        },
  { value: 'diamond', label: '♦', className: 'text-error'        },
  { value: 'club'   , label: '♣', className: 'text-base-content' }
];

const ranks: Array<{ value: Rank; label: string }> = [
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

/** スートとランクを常時表示してカード1枚を入力する */
export const PlayingCardInput = ({ label, value, isDisabled = false, isJokerShown = false, onChange }: PlayingCardInputProps): ReactElement => {
  /** 通常カードのスートを選択する */
  const onSelectSuit = (suit: Suit): void => onChange({ suit, rank: value.rank, isJoker: false });
  /** 通常カードのランクを選択する */
  const onSelectRank = (rank: Rank): void => onChange({ suit: value.suit, rank, isJoker: false });
  /** ジョーカーを選択する */
  const onSelectJoker = (): void => onChange({ suit: null, rank: null, isJoker: true });
  
  return (
    <fieldset className="rounded-box border border-base-300 pt-0 px-1 pb-2 min-w-38">
      <legend className="px-1 font-bold text-sm">{label}</legend>
      
      <div className="grid grid-cols-4 mb-1">
        {suits.map(suit => (
          <button
            key={suit.value} type="button"
            className={`btn btn-sm px-0 text-lg ${value.isJoker === false && value.suit === suit.value ? 'btn-info' : 'btn-ghost'} ${suit.className}`}
            onClick={() => onSelectSuit(suit.value)} disabled={isDisabled}
          >
            {suit.label}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-7">
        {ranks.map(rank => (
          <button
            key={rank.value} type="button"
            className={`btn btn-xs p-0 ${value.isJoker === false && value.rank === rank.value ? 'btn-info' : 'btn-ghost'}`}
            onClick={() => onSelectRank(rank.value)} disabled={isDisabled}
          >
            {rank.label}
          </button>
        ))}
        {isJokerShown && (
          <button
            type="button"
            className={`btn btn-xs p-0 ${value.isJoker ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={onSelectJoker} disabled={isDisabled}
          >
            🎃
          </button>
        )}
      </div>
    </fieldset>
  );
};

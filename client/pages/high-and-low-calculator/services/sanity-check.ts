import { DoubleUpService } from './double-up-service';
import { PokerService } from './poker-service';

import type { PlayingCard } from '../types/playing-card-types';
import type { PokerPlayingCard } from '../types/poker-types';

// TODO : ユニットテスト的なファイル・tsx とかで実行して確認する用に残しておくが、最終的にこのファイルの取り扱いをどうするかは要検討

/** スートとランクから通常のトランプカードを生成する */
const makePlayingCard = (suit: PlayingCard['suit'], rank: PlayingCard['rank']): PlayingCard => ({ suit, rank });

/** ポーカーの役判定と保持期待値を検証する Service */
const pokerService    = new PokerService();
/** ダブルアップの成功確率と継続判断を検証する Service */
const doubleUpService = new DoubleUpService();

/** 成功した検証件数 */
let passCount = 0;
/** 失敗した検証件数 */
let failCount = 0;
/** 実際値と期待値をJSON表現で比較して検証件数に反映する */
const check = (label: string, actual: unknown, expected: unknown): void => {
  /** オブジェクトを含む値が期待値と一致するか否か */
  const isMatch = JSON.stringify(actual) === JSON.stringify(expected);
  if(isMatch) {
    passCount++;
  }
  else {
    failCount++;
    console.log(`NG : ${label} -> Got ${JSON.stringify(actual)}・Expected ${JSON.stringify(expected)}`);
  }
}

// 役判定
check(
  'ロイヤルフラッシュ',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 10), makePlayingCard('spade', 11), makePlayingCard('spade', 12), makePlayingCard('spade', 13), makePlayingCard('spade', 14)]),
  'royalFlush'
);
check(
  'ストレートフラッシュ',
  pokerService.evaluatePlainHand([makePlayingCard('heart', 4), makePlayingCard('heart', 5), makePlayingCard('heart', 6), makePlayingCard('heart', 7), makePlayingCard('heart', 8)]),
  'straightFlush'
);
check(
  'フォーカード',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 9), makePlayingCard('heart', 9), makePlayingCard('diamond', 9), makePlayingCard('club', 9), makePlayingCard('spade', 3)]),
  'fourCard'
);
check(
  'フルハウス',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 9), makePlayingCard('heart', 9), makePlayingCard('diamond', 9), makePlayingCard('club', 3), makePlayingCard('spade', 3)]),
  'fullHouse'
);
check(
  'フラッシュ',
  pokerService.evaluatePlainHand([makePlayingCard('club', 2), makePlayingCard('club', 5), makePlayingCard('club', 9), makePlayingCard('club', 11), makePlayingCard('club', 13)]),
  'flush'
);
check(
  'ストレート (10-A、A は最大扱いで OK)',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 10), makePlayingCard('heart', 11), makePlayingCard('diamond', 12), makePlayingCard('club', 13), makePlayingCard('spade', 14)]),
  'straight'
);
check(
  'J-Q-K-A-2 はストレート不成立 (A は 2 に接続しない)',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 11), makePlayingCard('heart', 12), makePlayingCard('diamond', 13), makePlayingCard('club', 14), makePlayingCard('spade', 2)]),
  'none'
);
check(
  'スリーカード',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 7), makePlayingCard('heart', 7), makePlayingCard('diamond', 7), makePlayingCard('club', 2), makePlayingCard('spade', 9)]),
  'threeCard'
);
check(
  'ツーペア',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 7), makePlayingCard('heart', 7), makePlayingCard('diamond', 4), makePlayingCard('club', 4), makePlayingCard('spade', 9)]),
  'twoPair'
);
check(
  'ワンペア (配当なしだが役としては成立)',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 7), makePlayingCard('heart', 7), makePlayingCard('diamond', 4), makePlayingCard('club', 5), makePlayingCard('spade', 9)]),
  'onePair'
);
check(
  '役なし',
  pokerService.evaluatePlainHand([makePlayingCard('spade', 2), makePlayingCard('heart', 5), makePlayingCard('diamond', 9), makePlayingCard('club', 11), makePlayingCard('spade', 13)]),
  'none'
);

// ジョーカー絡み
check(
  '同ランク4枚 + ジョーカー = ファイブカード',
  pokerService.evaluateHandWithJoker([makePlayingCard('spade', 6), makePlayingCard('heart', 6), makePlayingCard('diamond', 6), makePlayingCard('club', 6)]),
  'fiveCard'
);
check(
  '3枚同ランク + ジョーカーでフォーカードに化ける',
  pokerService.evaluateHandWithJoker([makePlayingCard('spade', 6), makePlayingCard('heart', 6), makePlayingCard('diamond', 6), makePlayingCard('club', 9)]),
  'fourCard'
);
check(
  'ジョーカーでロイヤルフラッシュ完成',
  pokerService.evaluateHandWithJoker([makePlayingCard('spade', 10), makePlayingCard('spade', 11), makePlayingCard('spade', 12), makePlayingCard('spade', 13)]),
  'royalFlush'
);
check(
  'evaluateHand 経由 (ジョーカーなし5枚)',
  pokerService.evaluateHand([makePlayingCard('spade', 2), makePlayingCard('spade', 3), makePlayingCard('spade', 4), makePlayingCard('spade', 5), makePlayingCard('spade', 6)]),
  'straightFlush'
);

console.log(`役判定テスト : ${passCount} Passed・${failCount} Failed\n`);

// ダブルアップ確率
/** ハートの7が最初に提示された場合の「たかい」「ひくい」成功確率 */
const sevenDoubleUpProbabilities = doubleUpService.calcProbabilities(makePlayingCard('heart', 7), []);
console.log(`提示カード7 (既出なし) の確率 : higher=${sevenDoubleUpProbabilities.higher.toFixed(3)} lower=${sevenDoubleUpProbabilities.lower.toFixed(3)} sameRankRemainingPlayingCardCount=${sevenDoubleUpProbabilities.sameRankRemainingPlayingCardCount}`);
// 7 より大きい : 8・9・10・J・Q・K・A = 7ランク × 4枚 = 28枚 … 7 より小さい : 2..6 = 5ランク × 4枚 = 20枚 (決着48枚中)
check('7 提示時の higher 確率', Math.round(sevenDoubleUpProbabilities.higher * 1000) / 1000, Math.round((28 / 48) * 1000) / 1000);
check('7 提示時の lower 確率' , Math.round(sevenDoubleUpProbabilities.lower  * 1000) / 1000, Math.round((20 / 48) * 1000) / 1000);

check('エース提示時は higher が 0 (最上位)', doubleUpService.calcProbabilities(makePlayingCard('heart', 14), []).higher, 0);
check('2 提示時は lower が 0 (最下位)'     , doubleUpService.calcProbabilities(makePlayingCard('heart',  2), []).lower , 0);

// ダブルアップ継続判断
/** 期待値が現在のコインを上回る場合の継続判断 */
const continueDoubleUpDecision = doubleUpService.recommendAction({
  currentCoins: 200,
  bestSideProbability: 28 / 48
});
console.log(`\n200枚・成功率 58.3% での判断 : ${continueDoubleUpDecision.recommendation} (${continueDoubleUpDecision.reason})`);
check('EV 有利なら継続推奨', continueDoubleUpDecision.recommendation, 'continue');

/** 1プレイ上限を超えた場合の強制辞退判断 */
const capDoubleUpDecision = doubleUpService.recommendAction({
  currentCoins: 12800,
  bestSideProbability: .9
});
check('プレイ内上限超なら強制辞退', capDoubleUpDecision.recommendation, 'collect');

/** 未使用デッキ全体から最善の予測方向を選び続けた場合の平均成功確率 */
const expectedBestSideProbability = doubleUpService.calcExpectedBestSideProbability([]);
check('未使用デッキ全体の有利な側の平均成功確率は 50% を超える', expectedBestSideProbability > .5, true);

console.log(`\n役判定 + ダブルアップ 最終結果 : ${passCount} Passed・${failCount} Failed`);

// `shortcut` モードの速度・内訳確認
/** ショートカット計算と厳密計算を比較する交換前のトランプカード5枚 */
const dealtPokerPlayingCards: Array<PokerPlayingCard> = [
  makePlayingCard('spade'  ,  9),
  makePlayingCard('heart'  ,  9),
  makePlayingCard('diamond',  4),
  makePlayingCard('club'   , 11),
  makePlayingCard('spade'  ,  2)
];

console.time('`shortcut` モード (自動 : 軽い保持は厳密・重い保持はサンプリング)');
/** 厳密列挙とサンプリングを自動選択した全保持パターン */
const shortcutHoldOptions = pokerService.evaluateAllHoldOptions(dealtPokerPlayingCards);  // `mode` 省略 = `shortcut`
console.timeEnd('`shortcut` モード (自動 : 軽い保持は厳密・重い保持はサンプリング)');

console.log('\n`shortcut` モード上位3パターン :');
for(const holdOption of shortcutHoldOptions.slice(0, 3)) console.log(`  holdMask=${holdOption.holdMask.toString(2).padStart(5, '0')} discard=${holdOption.discardCount} EV=${holdOption.expectedValue.toFixed(2)}枚 (${holdOption.resultType}・n=${holdOption.sampleSize})`);

console.log('\n`discardCount` ごとの `resultType` 確認');
/** 交換枚数ごとに厳密列挙とサンプリングのどちらが選ばれたかを保持する */
const resultTypeByDiscardCount = new Map<number, string>();
for(const holdOption of shortcutHoldOptions) {
  if(!resultTypeByDiscardCount.has(holdOption.discardCount)) resultTypeByDiscardCount.set(holdOption.discardCount, holdOption.resultType);
}
for(const [discardCount, resultType] of [...resultTypeByDiscardCount.entries()].sort((resultTypeEntryA, resultTypeEntryB) => resultTypeEntryA[0] - resultTypeEntryB[0])) console.log(`  discard=${discardCount} -> ${resultType}`);

console.time('`exact` モード (全パターン強制厳密計算・比較用)');
/** 全保持パターンを強制的に全列挙した比較基準 */
const exactHoldOptions = pokerService.evaluateAllHoldOptions(dealtPokerPlayingCards, { mode: 'exact' });
console.timeEnd('`exact` モード (全パターン強制厳密計算・比較用)');

console.log('\n`exact` モードと `shortcut` モードの最良パターンを比較 :');
console.log(`  exact    : holdMask=${   exactHoldOptions[0].holdMask.toString(2).padStart(5, '0')} EV=${   exactHoldOptions[0].expectedValue.toFixed(2)}`);
console.log(`  shortcut : holdMask=${shortcutHoldOptions[0].holdMask.toString(2).padStart(5, '0')} EV=${shortcutHoldOptions[0].expectedValue.toFixed(2)}`);

if(failCount > 0) process.exit(1);

/*
# 実際に実行してみた結果
$ npx tsx ./client/pages/high-and-low-calculator/services/sanity-check.ts
役判定テスト : 15 Passed , 0 Failed

提示カード7 (既出なし) の確率 : higher=0.583 lower=0.417 sameRankRemainingPlayingCardCount=3

200枚・成功率 58.3% での判断 : continue (成功確率 58.3%、継続時の期待値 233 枚 > 現在の 200 枚のため継続が有利です)

役判定 + ダブルアップ 最終結果 : 22 Passed , 0 Failed
`shortcut` モード (自動 : 軽い保持は厳密・重い保持はサンプリング) : 1.022s

`shortcut` モード上位3パターン :
  holdMask=00011 discard=3 EV=84.79枚 (exact , n=17296)
  holdMask=00111 discard=2 EV=67.82枚 (exact , n=1128)
  holdMask=01011 discard=2 EV=67.82枚 (exact , n=1128)

`discardCount` ごとの `resultType` 確認
  discard=0 -> exact
  discard=1 -> exact
  discard=2 -> exact
  discard=3 -> exact
  discard=4 -> sampled
  discard=5 -> sampled
`exact` モード (全パターン強制厳密計算・比較用) : 7.039s

`exact` モードと `shortcut` モードの最良パターンを比較 :
  exact    : holdMask=00011 EV=84.79
  shortcut : holdMask=00011 EV=84.79
*/

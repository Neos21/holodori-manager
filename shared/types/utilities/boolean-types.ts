/** Boolean を 0・1 で表現した型 (循環参照を避けるためベタ書き) */
export type BooleanNumber = 0 | 1;

/** Boolean 相当の 0・1 を文字列で表現した型 */
export type BooleanString = `${BooleanNumber}`;

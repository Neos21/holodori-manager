/** SQLite には Boolean 型がないため、0 = False・1 = True で表現する箇所が多数ある・そのための定義 */
export const booleanNumberValues = [0, 1] as const;

/** Boolean を 0・1 で表現した型 */
export type BooleanNumber = (typeof booleanNumberValues)[number];

/** 0 = False */
export const booleanNumberFalse: BooleanNumber = booleanNumberValues[0];
/** 1 = True */
export const booleanNumberTrue: BooleanNumber = booleanNumberValues[1];

/** 主にフロントエンドのフォームにおいて Boolean 相当の 0・1 を文字列で扱う場面があるため定義 */
export const booleanStringValues = [String(booleanNumberFalse), String(booleanNumberTrue)] as const;

/** Boolean 相当の 0・1 を文字列で表現した型 */
export type BooleanString = (typeof booleanStringValues)[number];

/** '0' = False */
export const booleanStringFalse: BooleanString = String(booleanNumberFalse) as BooleanString;
/** '1' = True */
export const booleanStringTrue: BooleanString = String(booleanNumberTrue) as BooleanString;

import { reduceNewlines } from '../helpers/reduce-newlines';
import { booleanNumberFalse, booleanNumberTrue, booleanNumberValues, booleanStringFalse, booleanStringTrue, type BooleanNumber } from '../types/type-utilities';

/** 1行テキストを Trim する Preprocessor */
export const preprocessOneLineString    = (value: unknown): unknown => value == null ? ''   : typeof value === 'string' ? value.trim()                 : value;
/** 複数行テキストを Trim・空行調整する Preprocessor */
export const preprocessMultiLinesString = (value: unknown): unknown => value == null ? ''   : typeof value === 'string' ? reduceNewlines(value.trim()) : value;

/** Boolean に類する `value` をできるだけ Number に揃える Preprocessor */
export const preprocessBooleanNumber = (value: unknown): unknown => {
  if(typeof value === 'number') return booleanNumberValues.includes(value as BooleanNumber) ? value : value;  // 結局変わらないけどとりあえず…
  if(typeof value === 'boolean') return value ? booleanNumberTrue : booleanNumberFalse;
  if(typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if([booleanStringTrue , 'true' ].includes(normalized)) return booleanNumberTrue;
    if([booleanStringFalse, 'false'].includes(normalized)) return booleanNumberFalse;
    return value;
  }
  return value;
};

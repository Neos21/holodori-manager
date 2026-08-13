/** 3つ以上の改行を2つに留める */
export const reduceNewlines = (value: string): string => value.replace((/\r\n|\r/g), '\n').replace((/\n{3,}/g), '\n\n');

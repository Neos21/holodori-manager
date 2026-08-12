export type UpdateField = {
  column: string;
  value: unknown;
  shouldInclude?: (value: unknown) => boolean;
};

export const buildUpdateQuery = (fields: Array<UpdateField>): { sets: Array<string>; values: Array<unknown>; } => {
  const sets: Array<string> = [];
  const values: Array<unknown> = [];
  
  for(const field of fields) {
    const shouldInclude = field.shouldInclude ?? ((value: unknown): boolean => value != null);
    if(shouldInclude(field.value)) {
      sets.push(`${field.column} = ?`);
      values.push(field.value);
    }
  }
  
  return { sets, values };
};

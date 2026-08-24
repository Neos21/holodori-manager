import { describe, expect, it } from 'vitest';

import { holomemSchema } from './holomem-schema';

describe('holomem スキーマ', () => {
  it('フォーム入力値を正規化する', () => {
    const parsed = holomemSchema.parse({
      sort_order: ' 1 ',
      group_name: ' ホロライブ0期生 ',
      name      : ' ときのそら ',
      note      : ' 1行目\r\n\r\n\r\n2行目 ',
      is_active : 'true'
    });
    
    expect(parsed).toEqual({
      sort_order: 1,
      group_name: 'ホロライブ0期生',
      name      : 'ときのそら',
      note      : '1行目\n\n2行目',
      is_active : 1
    });
  });
  
  it('不正なフォーム入力値を拒否する', () => {
    const parsed = holomemSchema.safeParse({
      sort_order: 0,
      group_name: '',
      name      : '',
      note      : null,
      is_active : 2
    });
    
    expect(parsed.success).toBe(false);
  });
});

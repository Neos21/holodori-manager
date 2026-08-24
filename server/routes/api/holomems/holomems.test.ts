import { sign } from 'hono/jwt';
import { describe, expect, it, vi } from 'vitest';

import { holomems } from './holomems';

import type { Holomem } from '../../../../shared/types/entities/holomem';
import type { HonoBindings } from '../../../types/hono-bindings';

describe('holomems API', () => {
  it('認証済みの一覧取得リクエストにホロメンを返す', async () => {
    const expectedHolomems: Array<Holomem> = [
      {
        id        : 1,
        sort_order: 1,
        group_name: 'ホロライブ0期生',
        name      : 'ときのそら',
        note      : null,
        is_active : 1
      }
    ];
    const all = vi.fn().mockResolvedValue({ results: expectedHolomems });
    const prepare = vi.fn().mockReturnValue({ all });
    const adminJwtSecret = 'test-admin-jwt-secret';
    const bindings = {
      DB: { prepare } as unknown as D1Database,
      ADMIN_PASSWORD: 'test-admin-password',
      ADMIN_JWT_SECRET: adminJwtSecret
    } satisfies HonoBindings;
    const token = await sign({ exp: Math.floor(Date.now() / 1000) + 60 }, adminJwtSecret, 'HS256');
    
    const response = await holomems.request('/', {
      headers: { Authorization: `Bearer ${token}` }
    }, bindings);
    
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: expectedHolomems });
    expect(prepare).toHaveBeenCalledOnce();
    expect(all).toHaveBeenCalledOnce();
  });
});

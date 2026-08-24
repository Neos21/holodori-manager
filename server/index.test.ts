import { describe, expect, it } from 'vitest';

import app from './index';

describe('Server', () => {
  it('リクエストに対して Response を返す', async () => {
    const response = await app.request('/');
    
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(404);
  });
});

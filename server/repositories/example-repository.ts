// TODO : サンプル

import type { Example } from '../../shared/types/example';

export class ExampleRepository {
  constructor(private readonly db: D1Database) { }
  
  public async find(): Promise<Example | null> {
    return await this.db
      .prepare('SELECT id, name, content FROM example LIMIT 1')
      .first<Example>();
  }
}

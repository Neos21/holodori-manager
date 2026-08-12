// TODO : サンプル

import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { httpStatusCode } from '../../../../shared/constants/http-status-code';
import { ExampleRepository } from '../../../repositories/example-repository';

import type { HonoBindings } from '../../../types/hono-bindings';

export const example = new Hono<{ Bindings: HonoBindings; }>();
export const examplePath = '/example';

example.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

example.get('/', async context => {
  const result = await new ExampleRepository(context.env.DB).find();
  return context.json({ result }, httpStatusCode.ok);
});

import { Hono } from 'hono';

import { example, examplePath } from './example/example';
import { login, loginPath } from './login/login';

import type { HonoBindings } from '../../types/hono-bindings';

export const api = new Hono<{ Bindings: HonoBindings; }>();
export const apiPath = '/api';

api.route(loginPath  , login);
api.route(examplePath, example);

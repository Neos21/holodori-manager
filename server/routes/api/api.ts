import { Hono } from 'hono';

import { activeHoloworkMembers, activeHoloworkMembersPath } from './active-holowork-members/active-holowork-members';
import { boardNodes, boardNodesPath } from './board-nodes/board-nodes';
import { cards, cardsPath } from './cards/cards';
import { holomems, holomemsPath } from './holomems/holomems';
import { holoworkAchievements, holoworkAchievementsPath } from './holowork-achievements/holowork-achievements';
import { holoworks, holoworksPath } from './holoworks/holoworks';
import { login, loginPath } from './login/login';
import { memo, memoPath } from './memo/memo';

import type { HonoBindings } from '../../types/hono-bindings';

export const api = new Hono<{ Bindings: HonoBindings; }>();
export const apiPath = '/api';

api.route(loginPath                , login);
api.route(holomemsPath             , holomems);
api.route(cardsPath                , cards);
api.route(boardNodesPath           , boardNodes);
api.route(holoworkAchievementsPath , holoworkAchievements);
api.route(holoworksPath            , holoworks);
api.route(activeHoloworkMembersPath, activeHoloworkMembers);
api.route(memoPath                 , memo);

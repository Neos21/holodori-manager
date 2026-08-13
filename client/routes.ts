import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('./pages/index/index.tsx'),
  layout('./layouts/admin-layout.tsx', [
    route('/home'       , './pages/home/home.tsx'),
    route('/holomems'   , './pages/holomems/holomems.tsx'),
    route('/cards'      , './pages/cards/cards.tsx'),
    route('/board-nodes', './pages/board-nodes/board-nodes.tsx'),
    route('/holoworks'  , './pages/holoworks/holoworks.tsx')
  ])
] satisfies RouteConfig;

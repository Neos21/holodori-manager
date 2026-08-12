import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('./pages/index/index.tsx'),
  layout('./layouts/admin-layout.tsx', [
    route('/home'    , './pages/home/home.tsx'),
    route('/holomems', './pages/holomems/holomems.tsx')
  ])
] satisfies RouteConfig;

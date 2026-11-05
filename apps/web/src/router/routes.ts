import type { IconName } from '../shared/ui/icons.js';
export type RouteId = 'home' | 'discover' | 'poi-detail' | 'map' | 'mine' | 'trip' | 'favorites' | 'trips' | 'plaza';
type Tab = 'home' | 'discover' | 'map' | 'mine';
type RouteMeta = { id: RouteId | 'not-found'; title: string; english: string; description: string; icon: IconName; tab?: Tab };
export type ShellRoute = RouteMeta & { search: string; poiId?: string };
const routes: Record<RouteId, RouteMeta> = {
  home: { id: 'home', title: '首页', english: 'Home', description: '', icon: 'home', tab: 'home' },
  discover: { id: 'discover', title: '发现澳门', english: 'Discover', description: '寻找下一处心动的景点，了解它的故事与参观信息。', icon: 'compass', tab: 'discover' },
  'poi-detail': { id: 'poi-detail', title: '地点详情', english: 'POI Details', description: '', icon: 'compass', tab: 'discover' },
  map: { id: 'map', title: '澳门地图', english: 'Map', description: '在地图上查看行程中的地点与顺序。', icon: 'map', tab: 'map' },
  mine: { id: 'mine', title: '我的', english: 'Mine', description: '收好你的心动地点，也收好每一次澳门旅程。', icon: 'person', tab: 'mine' },
  trip: { id: 'trip', title: '旅行规划', english: 'Trip Planning', description: '从日期、出发点和偏好开始，准备一段属于你的旅程。', icon: 'compass', tab: 'home' },
  favorites: { id: 'favorites', title: '地点收藏', english: 'Favorites', description: '收藏心动的地点，与加入本次行程分别管理。', icon: 'heart', tab: 'mine' },
  trips: { id: 'trips', title: '我的澳门行程', english: 'My Macau Trips', description: '重新打开已经保存的行程，继续你的探索。', icon: 'calendar', tab: 'mine' },
  plaza: { id: 'plaza', title: '行程广场', english: 'Plaza', description: '从公开分享的澳门旅程中获得灵感，收藏其中的单个地点。', icon: 'grid', tab: 'discover' },
};
export function resolveRoute(hash: string): ShellRoute {
  const missing: ShellRoute = { id: 'not-found', title: '页面未找到', english: 'Page not found', description: '这个地址还没有对应的页面。', icon: 'compass', search: '' };
  const raw = hash.replace(/^#/, '') || '/home';
  if (!raw.startsWith('/') || raw.startsWith('//')) return missing;
  try {
    const url = new URL(raw, 'https://tripmate.invalid');
    if (url.pathname === '/') return { ...routes.home, search: url.search };
    const detail = /^\/pois\/([^/]+)$/.exec(url.pathname);
    if (detail) {
      const poiId = decodeURIComponent(detail[1]!);
      if (!/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(poiId)) return missing;
      return { ...routes['poi-detail'], search: url.search, poiId };
    }
    const id = url.pathname.slice(1);
    if (id !== 'poi-detail' && Object.prototype.hasOwnProperty.call(routes, id)) return { ...routes[id as RouteId], search: url.search };
  } catch { return missing; }
  return missing;
}
export const navigation = (['home', 'discover', 'map', 'mine'] as const).map(id => ({ ...routes[id], href: `#/${id}` }));
export const shortcuts = [
  { ...routes.trip, href: '#/trip', description: '安排下一段旅程' },
  { ...routes.favorites, href: '#/favorites', description: '留住每一个心动地点' },
  { ...routes.trips, href: '#/trips', description: '重温已保存的路线' },
  { ...routes.plaza, href: '#/plaza', description: '发现别人的旅行灵感' },
];

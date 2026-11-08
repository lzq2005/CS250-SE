import { onMounted, onUnmounted, shallowReadonly, shallowRef } from 'vue';
import { resolveRoute } from './routes';

const route = shallowRef(resolveRoute(typeof window === 'undefined' ? '' : window.location.hash));
let subscribers = 0;
let lastHash: string | undefined;
function refresh() {
  if (lastHash === window.location.hash) return;
  lastHash = window.location.hash;
  route.value = resolveRoute(lastHash);
}
function navigate(path: string, replace = false) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('#')) throw new Error('Shell navigation requires a local path.');
  if (replace) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${path}`);
  else window.location.hash = `#${path}`;
  refresh();
}
// Sole hash listener/parser. Features receive route data or navigate events;
// component-only previews reuse this controller rather than creating a router.
export function useShellRouter() {
  onMounted(() => {
    if (subscribers++ === 0) { window.addEventListener('hashchange', refresh); lastHash = undefined; }
    refresh();
  });
  onUnmounted(() => { if (--subscribers === 0) window.removeEventListener('hashchange', refresh); });
  return { route: shallowReadonly(route), navigate };
}

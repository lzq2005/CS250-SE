import { createApp, h, type App } from 'vue';
import ItineraryMap from './ItineraryMap.vue';
import { d01FixturePlan, d01FixturePois } from '../itinerary/d01-fixture';

type MapShellHarness = {
  mount: () => void;
  unmount: () => void;
};

declare global {
  interface Window {
    __mapShellHarness?: MapShellHarness;
  }
}

let mountedApp: App | undefined;
let host: HTMLDivElement | undefined;

function unmount(): void {
  mountedApp?.unmount();
  mountedApp = undefined;
  host?.remove();
  host = undefined;
}

function mount(): void {
  unmount();
  const shell = document.querySelector<HTMLElement>('.app-shell');
  if (!shell) throw new Error('B-01 shell was not found.');

  host = document.createElement('div');
  host.id = 'map-shell-test-host';
  host.style.cssText =
    'position:fixed;inset:0;z-index:1000;overflow:auto;background:#f4f7f5;';
  shell.append(host);

  mountedApp = createApp({
    render: () =>
      h(ItineraryMap, {
        plan: d01FixturePlan,
        pois: d01FixturePois,
        dataSourceLabel: 'Shell 回归测试 · D-02 fixture · 非真实 Planning API',
      }),
  });
  mountedApp.mount(host);
}

window.__mapShellHarness = { mount, unmount };
window.addEventListener('hashchange', () => {
  if (window.location.hash !== '#/map') unmount();
});

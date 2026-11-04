import { createApp, h } from 'vue';
import ItineraryMap from './ItineraryMap.vue';
import {
  d02InvalidCoordinatePois,
  d02MissingPoiPois,
  d02UnsafeNamePois,
} from './d02-boundary-fixture';
import { d01FixturePlan, d01FixturePois } from '../itinerary/d01-fixture';

const scenario = new URLSearchParams(window.location.search).get('scenario');
const scenarios = {
  'missing-poi': {
    pois: d02MissingPoiPois,
    label: '边界测试 fixture · 一个 POI 资料缺失 · 尚未接入真实 Planning API',
  },
  'invalid-coordinate': {
    pois: d02InvalidCoordinatePois,
    label: '边界测试 fixture · 一个经纬度越界 · 尚未接入真实 Planning API',
  },
  'unsafe-name': {
    pois: d02UnsafeNamePois,
    label: '安全测试 fixture · POI 名称包含 HTML 文本 · 尚未接入真实 Planning API',
  },
} as const;
const selectedScenario = scenario && scenario in scenarios
  ? scenarios[scenario as keyof typeof scenarios]
  : undefined;

createApp({
  render: () =>
    h(ItineraryMap, {
      plan: d01FixturePlan,
      pois: selectedScenario?.pois ?? d01FixturePois,
      dataSourceLabel: selectedScenario?.label
        ? selectedScenario.label
        : '测试 fixture 预览 · 尚未接入真实 Planning API',
    }),
}).mount('#app');

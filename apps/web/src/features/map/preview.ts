import { createApp, h } from 'vue';
import ItineraryMap from './ItineraryMap.vue';
import { d02MissingPoiPois } from './d02-boundary-fixture';
import { d01FixturePlan, d01FixturePois } from '../itinerary/d01-fixture';

const scenario = new URLSearchParams(window.location.search).get('scenario');
const missingPoi = scenario === 'missing-poi';

createApp({
  render: () =>
    h(ItineraryMap, {
      plan: d01FixturePlan,
      pois: missingPoi ? d02MissingPoiPois : d01FixturePois,
      dataSourceLabel: missingPoi
        ? '边界测试 fixture · 一个 POI 坐标资料缺失 · 尚未接入真实 Planning API'
        : '测试 fixture 预览 · 尚未接入真实 Planning API',
    }),
}).mount('#app');

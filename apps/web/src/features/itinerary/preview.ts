import { createApp, h } from 'vue';
import ItineraryDisplay from './ItineraryDisplay.vue';
import { d01FixturePlan, d01FixturePois } from './d01-fixture';

createApp({
  render: () =>
    h(ItineraryDisplay, {
      plan: d01FixturePlan,
      pois: d01FixturePois,
      tripTitle: '我的澳门行程',
      dataSourceLabel: '测试 fixture 预览 · 尚未接入真实 Planning API',
    }),
}).mount('#app');

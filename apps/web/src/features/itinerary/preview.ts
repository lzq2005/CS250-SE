import { createApp, h } from 'vue';
import ItineraryDisplay from './ItineraryDisplay.vue';
import { d01LegBoundaryPlan } from './d01-boundary-fixture';
import { d01FixturePlan, d01FixturePois } from './d01-fixture';

const scenario = new URLSearchParams(window.location.search).get('scenario');
const plan = scenario === 'leg-boundary' ? d01LegBoundaryPlan : d01FixturePlan;

createApp({
  render: () =>
    h(ItineraryDisplay, {
      plan,
      pois: d01FixturePois,
      tripTitle: '我的澳门行程',
      dataSourceLabel:
        scenario === 'leg-boundary'
          ? '边界测试 fixture · legs 顺序错位且存在缺失 · 尚未接入真实 Planning API'
          : '测试 fixture 预览 · 尚未接入真实 Planning API',
    }),
}).mount('#app');

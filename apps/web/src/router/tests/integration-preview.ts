import { createApp, defineComponent, h } from 'vue';
import App from '../../App.vue';
import ItineraryDisplay from '../../features/itinerary/ItineraryDisplay.vue';
import ItineraryMap from '../../features/map/ItineraryMap.vue';
import { d01FixturePlan, d01FixturePois } from '../../features/itinerary/d01-fixture';
import { shellFeatureViewsKey } from '../feature-views';
import '../../style.css';
// Test entry only: actual D component with explicit controlled props, not a
// production SavedItinerary loader, fixture fallback, or a second Router.
const view = defineComponent({ setup: () => () => h(ItineraryDisplay, {
  plan: d01FixturePlan, pois: d01FixturePois, tripTitle: 'B+D 组件集成测试', dataSourceLabel: '仅组件测试数据，非正式保存行程',
}) });
const mapView = defineComponent({ setup: () => () => h(ItineraryMap, {
  plan: d01FixturePlan, pois: d01FixturePois, dataSourceLabel: '仅组件测试数据，非真实规划地图',
}) });
createApp(App).provide(shellFeatureViewsKey, { trips: view, map: mapView }).mount('#app');

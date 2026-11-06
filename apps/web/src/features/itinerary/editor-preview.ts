import { createApp, h, ref } from 'vue';
import type { CandidatePlan, DraftEditRequest } from '@tripmate/contracts';
import ItineraryEditor from './ItineraryEditor.vue';
import { d03FixtureCandidate, d03FixtureInput } from './d03-fixture';
import { createD03TestAdapter } from './d03-test-adapter';

type EditorTestWindow = Window & {
  __d03Requests?: DraftEditRequest[];
};

const scenario = new URLSearchParams(window.location.search).get('scenario');
const adapter = createD03TestAdapter({
  delayMs: 40,
  failMessage: scenario === 'adapter-error' ? 'C adapter 暂不可用' : undefined,
});
(window as EditorTestWindow).__d03Requests = adapter.requests;

const candidate = ref<CandidatePlan>(structuredClone(d03FixtureCandidate));

createApp({
  render: () =>
    h(ItineraryEditor, {
      candidate: candidate.value,
      'onUpdate:candidate': (next: CandidatePlan) => {
        candidate.value = next;
      },
      pois: d03FixtureInput.selectedPois,
      adapter,
      dataSourceLabel: '测试 fixture · 使用 D-03 mock adapter · 尚未接入真实 C API',
    }),
}).mount('#app');

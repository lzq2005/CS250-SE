import { createApp, h, ref } from 'vue';
import type { CandidatePlan, DraftEditRequest, SaveItineraryRequest } from '@tripmate/contracts';
import ItineraryEditor from './ItineraryEditor.vue';
import ItineraryOverwriteAction from './ItineraryOverwriteAction.vue';
import { d03FixtureCandidate, d03FixtureInput } from './d03-fixture';
import { createD03TestAdapter } from './d03-test-adapter';
import { createD04OverwriteTestAdapter } from './d04-test-adapter';

type ConfirmationTestWindow = Window & {
  __d04EditRequests?: DraftEditRequest[];
  __d04OverwriteRequests?: Array<Extract<SaveItineraryRequest, { mode: 'overwrite' }>>;
};

const scenario = new URLSearchParams(window.location.search).get('scenario');
const editAdapter = createD03TestAdapter({
  delayMs: 40,
  failMessage: scenario === 'edit-error' ? '候选删除暂时失败' : undefined,
});
const overwriteAdapter = createD04OverwriteTestAdapter({
  failMessage: scenario === 'overwrite-error' ? '覆盖暂时失败' : undefined,
});
const testWindow = window as ConfirmationTestWindow;
testWindow.__d04EditRequests = editAdapter.requests;
testWindow.__d04OverwriteRequests = overwriteAdapter.requests;

const candidate = ref<CandidatePlan>(structuredClone(d03FixtureCandidate));

createApp({
  render: () =>
    h('div', [
      h(ItineraryEditor, {
        candidate: candidate.value,
        'onUpdate:candidate': (next: CandidatePlan) => {
          candidate.value = next;
        },
        pois: d03FixtureInput.selectedPois,
        adapter: editAdapter,
        allowRemoveStop: true,
        dataSourceLabel: 'D-04 测试 fixture · 删除与覆盖仅使用 mock adapter，未接入真实 API',
      }),
      h(ItineraryOverwriteAction, {
        candidate: candidate.value,
        itineraryId: '50000000-0000-4000-8000-000000000001',
        expectedVersion: 3,
        adapter: overwriteAdapter,
      }),
    ]),
}).mount('#app');

import { createApp, h, ref } from 'vue';
import type { CandidatePlan, SavedItinerary } from '@tripmate/contracts';
import ItineraryDisplay from './ItineraryDisplay.vue';
import SavedItineraryLibrary from './SavedItineraryLibrary.vue';
import { d03FixtureCandidate } from './d03-fixture';
import {
  createD05TestAdapter,
  createSavedItineraryFixture,
  type D05TestAdapter,
} from './d05-test-adapter';

type SavedItineraryTestWindow = Window & {
  __d05Adapter?: D05TestAdapter;
};

const scenario = new URLSearchParams(window.location.search).get('scenario');
const candidate = ref<CandidatePlan>(structuredClone(d03FixtureCandidate));
const adapter = createD05TestAdapter({
  initialItems: [createSavedItineraryFixture(candidate.value)],
  versionConflict: scenario === 'version-conflict',
  failCreateMessage: scenario === 'create-error' ? '保存服务暂时不可用' : undefined,
});
const opened = ref<SavedItinerary | null>(null);
(window as SavedItineraryTestWindow).__d05Adapter = adapter;

createApp({
  render: () =>
    h('div', [
      h(
        SavedItineraryLibrary,
        {
          candidate: candidate.value,
          adapter,
          dataSourceLabel: 'D-05 测试 fixture · 使用 mock adapter · 真实 D 路由尚未由 A 注册',
          onSaved: (saved: SavedItinerary) => {
            opened.value = saved;
          },
          onOpened: (saved: SavedItinerary) => {
            opened.value = saved;
          },
        },
        {
          opened: ({ saved }: { saved: SavedItinerary | null }) =>
            saved
              ? h('section', { 'data-testid': 'reopened-snapshot' }, [
                  h('p', { class: 'preview-kicker' }, 'REOPENED SNAPSHOT'),
                  h('p', { class: 'preview-meta' }, `v${saved.version} · ${saved.input.trip.title}`),
                  h(ItineraryDisplay, {
                    plan: saved.result,
                    pois: saved.input.selectedPois,
                    tripTitle: saved.input.trip.title,
                  }),
                ])
              : null,
        },
      ),
    ]),
}).mount('#app');

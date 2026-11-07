<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { CandidatePlan, SavedItinerary } from '@tripmate/contracts';
import type { SavedItineraryAdapter } from './savedItineraryAdapter';
import ItineraryOverwriteAction from './ItineraryOverwriteAction.vue';

const props = defineProps<{
  candidate: CandidatePlan;
  adapter: SavedItineraryAdapter;
  dataSourceLabel?: string;
}>();

const emit = defineEmits<{
  saved: [saved: SavedItinerary];
  opened: [saved: SavedItinerary];
}>();

const items = ref<SavedItinerary[]>([]);
const selectedId = ref('');
const opened = ref<SavedItinerary | null>(null);
const loading = ref(true);
const creating = ref(false);
const openingId = ref('');
const message = ref('');
const errorMessage = ref('');

const selected = computed(
  () => items.value.find((item) => item.id === selectedId.value) ?? null,
);
const busy = computed(() => loading.value || creating.value || openingId.value !== '');

function upsert(saved: SavedItinerary, select = true): void {
  const index = items.value.findIndex((item) => item.id === saved.id);
  if (index === -1) items.value = [...items.value, saved];
  else items.value = items.value.map((item) => item.id === saved.id ? saved : item);
  if (select) selectedId.value = saved.id;
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return '行程保存操作失败，请重试。';
  const candidateError = error as Error & {
    code?: string | null;
    details?: Record<string, unknown> | null;
  };
  if (candidateError.code === 'VERSION_CONFLICT') {
    const actualVersion = candidateError.details?.actualVersion;
    const suffix = typeof actualVersion === 'number' ? ` 最新版本为 v${actualVersion}。` : '';
    return `${candidateError.message}${suffix}`;
  }
  return candidateError.message;
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Macau',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function refreshList(showLoadedMessage = false, preserveError = false): Promise<void> {
  loading.value = true;
  if (!preserveError) errorMessage.value = '';
  try {
    const response = await props.adapter.list(props.candidate.input.trip.id);
    items.value = response.items;
    if (!items.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = items.value[0]?.id ?? '';
    }
    if (showLoadedMessage) message.value = '已刷新保存列表。';
  } catch (error) {
    errorMessage.value = errorText(error);
  } finally {
    loading.value = false;
  }
}

async function saveNew(): Promise<void> {
  if (busy.value) return;
  creating.value = true;
  message.value = '';
  errorMessage.value = '';
  try {
    const saved = await props.adapter.create({
      mode: 'create',
      candidate: props.candidate,
    });
    upsert(saved);
    opened.value = saved;
    message.value = `已保存新行程 v${saved.version}。`;
    emit('saved', saved);
  } catch (error) {
    errorMessage.value = errorText(error);
  } finally {
    creating.value = false;
  }
}

async function reopen(item: SavedItinerary): Promise<void> {
  if (busy.value) return;
  openingId.value = item.id;
  message.value = '';
  errorMessage.value = '';
  try {
    const saved = await props.adapter.get(item.id);
    upsert(saved);
    opened.value = saved;
    message.value = `已重新打开 v${saved.version} 快照。`;
    emit('opened', saved);
  } catch (error) {
    errorMessage.value = errorText(error);
  } finally {
    openingId.value = '';
  }
}

function handleOverwritten(saved: SavedItinerary): void {
  upsert(saved);
  opened.value = saved;
  message.value = `已覆盖保存为 v${saved.version}。`;
  errorMessage.value = '';
  emit('saved', saved);
}

function handleOverwriteError(error: Error): void {
  errorMessage.value = errorText(error);
  const candidateError = error as Error & { code?: string | null };
  if (candidateError.code === 'VERSION_CONFLICT') {
    void refreshList(false, true);
  }
}

onMounted(() => {
  void refreshList();
});
</script>

<template>
  <section class="saved-library" aria-labelledby="saved-library-title">
    <p v-if="dataSourceLabel" class="fixture-banner">{{ dataSourceLabel }}</p>

    <header class="library-heading">
      <div>
        <p class="eyebrow">SAVED ITINERARIES</p>
        <h2 id="saved-library-title">保存与重新打开</h2>
        <p>保存当前候选快照；覆盖时使用版本检查，重新打开不会用最新 Trip 取代历史输入。</p>
      </div>
      <button
        type="button"
        class="save-new"
        :disabled="busy"
        data-testid="save-new-itinerary"
        @click="saveNew"
      >
        {{ creating ? '保存中…' : '保存为新行程' }}
      </button>
    </header>

    <p v-if="message" class="feedback feedback--success" role="status">{{ message }}</p>
    <p v-if="errorMessage" class="feedback feedback--error" role="alert">{{ errorMessage }}</p>

    <section class="library-panel" aria-labelledby="saved-list-title">
      <header>
        <div>
          <span>LIBRARY</span>
          <h3 id="saved-list-title">已保存行程</h3>
        </div>
        <button type="button" class="refresh" :disabled="busy" @click="refreshList(true)">
          刷新列表
        </button>
      </header>

      <p v-if="loading" class="empty-state">正在读取保存列表…</p>
      <p v-else-if="items.length === 0" class="empty-state">还没有保存的行程。</p>
      <ul v-else class="saved-list">
        <li
          v-for="item in items"
          :key="item.id"
          class="saved-item"
          :class="{ selected: item.id === selectedId }"
          data-testid="saved-itinerary"
        >
          <button
            type="button"
            class="saved-summary"
            :aria-pressed="item.id === selectedId"
            @click="selectedId = item.id"
          >
            <span class="version">v{{ item.version }}</span>
            <span>
              <strong>{{ item.input.trip.title }}</strong>
              <small>更新于 {{ formatUpdatedAt(item.updatedAt) }}</small>
            </span>
          </button>
          <button
            type="button"
            class="reopen"
            :disabled="busy"
            :aria-label="`重新打开版本 ${item.version}`"
            @click="reopen(item)"
          >
            {{ openingId === item.id ? '打开中…' : '重新打开' }}
          </button>
        </li>
      </ul>
    </section>

    <ItineraryOverwriteAction
      v-if="selected"
      :key="`${selected.id}-${selected.version}`"
      :candidate="candidate"
      :itinerary-id="selected.id"
      :expected-version="selected.version"
      :adapter="adapter"
      @overwritten="handleOverwritten"
      @error="handleOverwriteError"
    />

    <slot name="opened" :saved="opened">
      <section v-if="opened" class="opened-summary" data-testid="reopened-summary">
        <span>REOPENED SNAPSHOT</span>
        <h3>已重新打开 v{{ opened.version }}</h3>
        <p>{{ opened.input.trip.title }} · {{ formatUpdatedAt(opened.updatedAt) }}</p>
      </section>
    </slot>
  </section>
</template>

<style scoped>
.saved-library {
  --ink: #15332f;
  --muted: #5d706d;
  --line: #d8e4df;
  --surface: #fff;
  --wash: #f2f7f4;
  --accent: #116b5c;
  max-width: 1120px;
  margin: 0 auto;
  padding: 36px 24px 56px;
  color: var(--ink);
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
}

.fixture-banner {
  margin: 0 0 20px;
  border: 1px solid #d5c39c;
  border-radius: 10px;
  background: #fff8e8;
  color: #654a17;
  padding: 10px 14px;
  font-size: 13px;
}

.library-heading {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: end;
  margin-bottom: 18px;
}

.eyebrow,
.library-panel header span,
.opened-summary > span {
  color: var(--accent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.library-heading h2 {
  margin: 5px 0 8px;
  font-size: clamp(28px, 5vw, 44px);
  letter-spacing: -0.035em;
}

.library-heading p,
.empty-state {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

button {
  border: 0;
  border-radius: 9px;
  padding: 9px 12px;
  font: 700 12px "Segoe UI", "Microsoft YaHei", sans-serif;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.save-new {
  flex: none;
  background: var(--accent);
  color: #fff;
}

.feedback {
  margin: 0 0 12px;
  border-radius: 10px;
  padding: 10px 13px;
  font-size: 12px;
}

.feedback--success {
  background: #dcefe8;
  color: var(--accent);
}

.feedback--error {
  background: #fbe9e7;
  color: #8f2d20;
}

.library-panel {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  padding: 18px;
}

.library-panel > header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
}

.library-panel h3 {
  margin: 4px 0 0;
  font-size: 18px;
}

.refresh {
  background: var(--wash);
  color: var(--ink);
}

.empty-state {
  border-radius: 10px;
  background: var(--wash);
  padding: 14px;
  font-size: 12px;
}

.saved-list {
  display: grid;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.saved-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 9px;
}

.saved-item.selected {
  border-color: var(--accent);
  background: #f5fbf8;
}

.saved-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  background: transparent;
  color: var(--ink);
  text-align: left;
}

.version {
  display: grid;
  place-items: center;
  width: 38px;
  height: 34px;
  border-radius: 9px;
  background: var(--ink);
  color: #fff;
  font-size: 11px;
}

.saved-summary strong,
.saved-summary small {
  display: block;
}

.saved-summary strong {
  margin-bottom: 3px;
  font-size: 13px;
}

.saved-summary small {
  color: var(--muted);
  font-size: 10px;
}

.reopen {
  background: var(--wash);
  color: var(--accent);
}

.opened-summary {
  margin-top: 20px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: var(--surface);
  padding: 16px 18px;
}

.opened-summary h3 {
  margin: 5px 0;
  font-size: 18px;
}

.opened-summary p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 640px) {
  .saved-library {
    padding: 26px 16px 42px;
  }

  .library-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .save-new {
    width: 100%;
  }

  .saved-item {
    grid-template-columns: 1fr;
  }

  .reopen {
    width: 100%;
  }
}
</style>

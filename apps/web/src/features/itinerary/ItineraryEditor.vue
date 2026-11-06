<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type {
  CandidatePlan,
  EditCommand,
  ItineraryDay,
  POI,
  PlannedStop,
  TravelLeg,
  TravelMode,
} from '@tripmate/contracts';
import type { CandidateEditorAdapter } from './editorAdapter';
import DestructiveActionDialog from './DestructiveActionDialog.vue';

const candidate = defineModel<CandidatePlan>('candidate', { required: true });
const props = defineProps<{
  pois: POI[];
  adapter: CandidateEditorAdapter;
  dataSourceLabel?: string;
  allowRemoveStop?: boolean;
}>();

type TimeDraft = { start: string; end: string };
type ModeDraft = { mode: TravelMode };

const activeDate = ref('');
const busyStopId = ref<string | null>(null);
const successMessage = ref('');
const errorMessage = ref('');
const pendingRemoval = ref<PlannedStop | null>(null);
const timeDrafts = reactive<Record<string, TimeDraft>>({});
const modeDrafts = reactive<Record<string, ModeDraft>>({});

const orderedDays = computed(() =>
  [...candidate.value.result.days].sort((left, right) => left.date.localeCompare(right.date)),
);
const activeDay = computed(
  () => orderedDays.value.find((day) => day.date === activeDate.value) ?? orderedDays.value[0],
);
const poiById = computed(() => new Map(props.pois.map((poi) => [poi.id, poi])));
const isBusy = computed(() => busyStopId.value !== null);

const statusLabels: Record<CandidatePlan['result']['status'], string> = {
  feasible: '可以执行',
  needs_review: '需要检查',
  infeasible: '存在冲突',
};

const modeLabels: Record<TravelMode, string> = {
  walk: '步行',
  bus: '公交',
  taxi: '出租车',
};

function findLeg(day: ItineraryDay, stop: PlannedStop): TravelLeg | undefined {
  const matches = day.legs.filter((leg) => leg.toPoiId === stop.poiId);
  return matches.length === 1 ? matches[0] : undefined;
}

function initializeDrafts(day: ItineraryDay | undefined): void {
  for (const key of Object.keys(timeDrafts)) delete timeDrafts[key];
  for (const key of Object.keys(modeDrafts)) delete modeDrafts[key];
  if (!day) return;

  for (const stop of day.stops) {
    timeDrafts[stop.id] = {
      start: stop.start ?? '',
      end: stop.end ?? '',
    };
    const leg = findLeg(day, stop);
    modeDrafts[stop.poiId] = { mode: leg?.mode ?? 'walk' };
  }
}

function parseQuarterHour(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const total = Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  return total % 15 === 0 ? total : null;
}

function validateVisitTime(start: string, end: string): string | null {
  if (!start || !end) return '开始时间和结束时间不能为空。';
  const startMinutes = parseQuarterHour(start);
  const endMinutes = parseQuarterHour(end);
  if (startMinutes === null || endMinutes === null) {
    return '时间必须是 15 分钟粒度的合法 HH:mm。';
  }
  if (startMinutes >= endMinutes) return '结束时间必须晚于开始时间。';
  return null;
}

function currentStopTime(stop: PlannedStop): string {
  return `${stop.start ?? '待确定'} - ${stop.end ?? '待确定'}`;
}

async function applyCommand(
  stop: PlannedStop,
  command: EditCommand,
  successText: string,
): Promise<boolean> {
  if (isBusy.value) return false;
  busyStopId.value = stop.id;
  successMessage.value = '';
  errorMessage.value = '';
  try {
    const updated = await props.adapter.editDraft({
      action: 'editDraft',
      candidate: candidate.value,
      command,
    });
    candidate.value = updated;
    successMessage.value = successText;
    return true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '修改失败，请重试。';
    initializeDrafts(activeDay.value);
    return false;
  } finally {
    busyStopId.value = null;
  }
}

async function applyVisitTime(stop: PlannedStop): Promise<void> {
  const draft = timeDrafts[stop.id];
  if (!draft) return;
  const validationError = validateVisitTime(draft.start, draft.end);
  if (validationError) {
    successMessage.value = '';
    errorMessage.value = validationError;
    return;
  }

  await applyCommand(
    stop,
    { type: 'setVisitTime', stopId: stop.id, start: draft.start, end: draft.end },
    '时间修改已应用',
  );
}

function requestStopRemoval(stop: PlannedStop): void {
  if (!props.allowRemoveStop || isBusy.value) return;
  errorMessage.value = '';
  successMessage.value = '';
  pendingRemoval.value = stop;
}

function cancelStopRemoval(): void {
  if (isBusy.value) return;
  pendingRemoval.value = null;
  errorMessage.value = '';
}

async function confirmStopRemoval(): Promise<void> {
  const stop = pendingRemoval.value;
  if (!stop || isBusy.value) return;
  const removed = await applyCommand(
    stop,
    { type: 'removeStop', stopId: stop.id, confirmed: true },
    '景点已从当前日程移除',
  );
  if (removed) pendingRemoval.value = null;
}

async function applyTransportMode(stop: PlannedStop): Promise<void> {
  const day = activeDay.value;
  const draft = modeDrafts[stop.poiId];
  if (!day || !draft) return;
  const leg = findLeg(day, stop);
  if (!leg) {
    errorMessage.value = '该站点缺少可修改的入站交通记录。';
    return;
  }
  if (leg.mode === draft.mode) {
    successMessage.value = '交通方式未发生变化。';
    errorMessage.value = '';
    return;
  }

  await applyCommand(
    stop,
    { type: 'setTransportMode', date: day.date, toPoiId: stop.poiId, mode: draft.mode },
    '交通方式修改已应用',
  );
}

watch(
  orderedDays,
  (days) => {
    if (!days.some((day) => day.date === activeDate.value)) {
      activeDate.value = days[0]?.date ?? '';
    }
  },
  { immediate: true },
);

watch(activeDay, initializeDrafts, { immediate: true, deep: true });
</script>

<template>
  <section class="itinerary-editor" aria-labelledby="itinerary-editor-heading">
    <p v-if="dataSourceLabel" class="fixture-banner">{{ dataSourceLabel }}</p>

    <header class="editor-heading">
      <div>
        <p class="eyebrow">EDIT CANDIDATE</p>
        <h1 id="itinerary-editor-heading">编辑行程</h1>
        <p class="intro">
          每次修改都由 C adapter 返回新的 CandidatePlan，本组件不会在浏览器内执行规划或冲突重算。
        </p>
      </div>
      <div class="candidate-status">
        <span>当前候选</span>
        <strong :class="`status--${candidate.result.status}`">
          {{ statusLabels[candidate.result.status] }}
        </strong>
      </div>
    </header>

    <div class="day-tabs" role="group" aria-label="选择编辑日期">
      <button
        v-for="(day, index) in orderedDays"
        :key="day.date"
        type="button"
        :aria-label="`第 ${index + 1} 天 ${day.date}`"
        :aria-pressed="day.date === activeDay?.date"
        :class="{ active: day.date === activeDay?.date }"
        :disabled="isBusy"
        @click="activeDate = day.date"
      >
        <span>第 {{ index + 1 }} 天</span>
        <strong>{{ day.date }}</strong>
      </button>
    </div>

    <p v-if="successMessage" class="feedback feedback--success" role="status">
      {{ successMessage }}
    </p>
    <p v-if="errorMessage && pendingRemoval === null" class="feedback feedback--error" role="alert">
      {{ errorMessage }}
    </p>

    <p v-if="!activeDay?.stops.length" class="empty-state">当天暂无已安排景点。</p>

    <ol v-else class="editor-stop-list" aria-label="待编辑行程站点">
      <li
        v-for="(stop, index) in activeDay.stops"
        :key="stop.id"
        data-testid="editor-stop"
        :data-poi-id="stop.poiId"
        class="editor-stop"
      >
        <header class="stop-heading">
          <span class="stop-number" aria-hidden="true">{{ index + 1 }}</span>
          <div>
            <h2>{{ poiById.get(stop.poiId)?.name ?? '地点资料不可用' }}</h2>
            <p data-testid="editor-current-time">{{ currentStopTime(stop) }}</p>
          </div>
          <span class="stop-order">第 {{ index + 1 }} 站</span>
        </header>

        <div class="editor-grid">
          <form class="edit-panel" novalidate @submit.prevent="applyVisitTime(stop)">
            <div class="panel-heading">
              <span>TIME</span>
              <strong>参观时间</strong>
              <small>15 分钟粒度</small>
            </div>
            <div class="time-fields">
              <label>
                开始 {{ poiById.get(stop.poiId)?.name ?? '地点资料不可用' }}
                <input
                  v-model="timeDrafts[stop.id]!.start"
                  type="time"
                  step="900"
                  :disabled="isBusy"
                />
              </label>
              <label>
                结束 {{ poiById.get(stop.poiId)?.name ?? '地点资料不可用' }}
                <input
                  v-model="timeDrafts[stop.id]!.end"
                  type="time"
                  step="900"
                  :disabled="isBusy"
                />
              </label>
            </div>
            <button
              type="submit"
              class="primary-action"
              :disabled="isBusy"
              :aria-label="`应用${poiById.get(stop.poiId)?.name ?? '地点'}时间`"
            >
              {{ busyStopId === stop.id ? '计算中…' : '应用时间' }}
            </button>
          </form>

          <form class="edit-panel" novalidate @submit.prevent="applyTransportMode(stop)">
            <div class="panel-heading">
              <span>TRANSPORT</span>
              <strong>到达交通</strong>
              <small data-testid="editor-leg-mode">
                {{ modeLabels[findLeg(activeDay, stop)?.mode ?? 'walk'] }}
              </small>
            </div>
            <label>
              到 {{ poiById.get(stop.poiId)?.name ?? '地点资料不可用' }} 的交通方式
              <select v-model="modeDrafts[stop.poiId]!.mode" :disabled="isBusy">
                <option value="walk">步行</option>
                <option value="bus">公交</option>
                <option value="taxi">出租车</option>
              </select>
            </label>
            <button
              type="submit"
              class="secondary-action"
              :disabled="isBusy || !findLeg(activeDay, stop)"
              :aria-label="`应用${poiById.get(stop.poiId)?.name ?? '地点'}交通`"
            >
              {{ busyStopId === stop.id ? '计算中…' : '应用交通' }}
            </button>
          </form>
        </div>

        <button
          v-if="allowRemoveStop"
          type="button"
          class="remove-action"
          :disabled="isBusy"
          :aria-label="`从当前日程移除 ${poiById.get(stop.poiId)?.name ?? '地点'}`"
          @click="requestStopRemoval(stop)"
        >
          从当前日程移除
        </button>
      </li>
    </ol>

    <section class="result-notes" aria-labelledby="candidate-notes-heading">
      <h2 id="candidate-notes-heading">当前候选提示</h2>
      <p v-if="candidate.result.warnings.length === 0" class="empty-state">当前没有提醒。</p>
      <ul v-else>
        <li v-for="(warning, index) in candidate.result.warnings" :key="`${warning.code}-${warning.poiId}-${index}`">
          <strong>{{ warning.code }}</strong>
          <span>{{ warning.message }}</span>
        </li>
      </ul>
      <div v-if="candidate.result.unscheduled.length" class="unscheduled-summary">
        <h3>未安排景点</h3>
        <ul>
          <li
            v-for="item in candidate.result.unscheduled"
            :key="`${item.poiId}-${item.code}`"
            data-testid="unscheduled-candidate"
          >
            <strong>{{ poiById.get(item.poiId)?.name ?? '地点资料不可用' }}</strong>
            <span>{{ item.code }} · {{ item.reason }}</span>
          </li>
        </ul>
      </div>
      <p class="scope-note">
        顺序调整当前没有共享编辑命令；覆盖已保存行程需通过独立确认流程。
      </p>
    </section>

    <DestructiveActionDialog
      :open="pendingRemoval !== null"
      title="从当前日程移除景点？"
      :description="`将“${pendingRemoval ? poiById.get(pendingRemoval.poiId)?.name ?? '该地点' : '该地点'}”从当前日程移除。它会保留为未安排，不会删除行程目标或收藏。`"
      confirm-label="确认移除"
      cancel-label="取消移除"
      :busy="isBusy"
      :error-message="errorMessage"
      @cancel="cancelStopRemoval"
      @confirm="confirmStopRemoval"
    />
  </section>
</template>

<style scoped>
.itinerary-editor {
  --ink: #15332f;
  --muted: #5d706d;
  --line: #d8e4df;
  --surface: #ffffff;
  --wash: #f2f7f4;
  --accent: #116b5c;
  --accent-soft: #dcefe8;
  --warm: #9b4b1c;
  color: var(--ink);
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  max-width: 1120px;
  margin: 0 auto;
  padding: 44px 24px 64px;
}

.fixture-banner {
  margin: 0 0 22px;
  border: 1px solid #d5c39c;
  border-radius: 10px;
  background: #fff8e8;
  color: #654a17;
  padding: 10px 14px;
  font-size: 13px;
}

.editor-heading {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  align-items: end;
}

.eyebrow {
  margin: 0 0 7px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 10px;
  font-size: clamp(34px, 6vw, 54px);
  line-height: 1.06;
  letter-spacing: -0.035em;
}

.intro {
  max-width: 640px;
  margin-bottom: 0;
  color: var(--muted);
  line-height: 1.55;
}

.candidate-status {
  display: grid;
  gap: 4px;
  min-width: 130px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  padding: 13px 15px;
}

.candidate-status span {
  color: var(--muted);
  font-size: 10px;
}

.candidate-status strong {
  font-size: 15px;
}

.status--feasible {
  color: var(--accent);
}

.status--needs_review {
  color: var(--warm);
}

.status--infeasible {
  color: #a12d2d;
}

.day-tabs {
  display: flex;
  gap: 9px;
  overflow-x: auto;
  padding: 22px 0 16px;
}

.day-tabs button {
  display: grid;
  grid-template-columns: auto auto;
  gap: 2px 12px;
  flex: none;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--surface);
  color: var(--ink);
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
}

.day-tabs button.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.day-tabs button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.day-tabs span,
.day-tabs strong {
  font-size: 11px;
}

.feedback {
  margin: 0 0 14px;
  border-radius: 10px;
  padding: 10px 13px;
  font-size: 12px;
}

.feedback--success {
  background: var(--accent-soft);
  color: var(--accent);
}

.feedback--error {
  background: #fbe9e7;
  color: #8f2d20;
}

.editor-stop-list {
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.editor-stop {
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  padding: 20px;
}

.stop-heading {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  margin-bottom: 15px;
}

.stop-number {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.stop-heading h2 {
  margin-bottom: 3px;
  font-size: 18px;
}

.stop-heading p,
.stop-order {
  margin-bottom: 0;
  color: var(--muted);
  font-size: 11px;
}

.stop-order {
  border-radius: 999px;
  background: var(--wash);
  padding: 5px 9px;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.edit-panel {
  display: grid;
  gap: 12px;
  border-radius: 13px;
  background: var(--wash);
  padding: 14px;
}

.panel-heading {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.panel-heading > span {
  color: var(--accent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.panel-heading strong {
  font-size: 14px;
}

.panel-heading small {
  margin-left: auto;
  color: var(--muted);
  font-size: 10px;
}

.time-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.edit-panel label {
  display: grid;
  gap: 5px;
  color: var(--muted);
  font-size: 10px;
}

input,
select {
  width: 100%;
  min-width: 0;
  border: 1px solid #c8d7d1;
  border-radius: 9px;
  background: #fff;
  color: var(--ink);
  padding: 8px 9px;
  font: 13px "Segoe UI", "Microsoft YaHei", sans-serif;
}

input:focus-visible,
select:focus-visible,
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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

.primary-action {
  background: var(--accent);
  color: #fff;
}

.secondary-action {
  background: #dce5e1;
  color: var(--ink);
}

.remove-action {
  margin-top: 12px;
  border: 1px solid #e1bbb5;
  background: #fff7f5;
  color: #8f2d20;
}

.result-notes {
  margin-top: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  padding: 18px;
}

.result-notes h2 {
  margin-bottom: 10px;
  font-size: 18px;
}

.result-notes ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.result-notes li {
  display: flex;
  gap: 8px;
  border-radius: 9px;
  background: var(--wash);
  padding: 9px 11px;
  font-size: 12px;
}

.result-notes li strong {
  flex: none;
  color: var(--warm);
}

.empty-state,
.scope-note {
  color: var(--muted);
  font-size: 12px;
}

.unscheduled-summary {
  margin-top: 14px;
  border-top: 1px solid var(--line);
  padding-top: 13px;
}

.unscheduled-summary h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.unscheduled-summary strong {
  color: var(--ink);
}

.scope-note {
  margin: 13px 0 0;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}

@media (max-width: 720px) {
  .itinerary-editor {
    padding: 28px 16px 44px;
  }

  .editor-heading {
    align-items: start;
    flex-direction: column;
  }

  .editor-grid {
    grid-template-columns: 1fr;
  }

  .editor-stop {
    padding: 16px;
  }

  .stop-heading {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .stop-order {
    display: none;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import type {
  KnownStatus,
  PlanResult,
  PlanWarning,
  POI,
  TravelLeg,
  TravelMode,
  WarningCode,
} from '@tripmate/contracts';

const props = defineProps<{
  plan: PlanResult;
  pois: POI[];
  tripTitle?: string;
  dataSourceLabel?: string;
}>();

const poiById = computed(() => new Map(props.pois.map((poi) => [poi.id, poi])));
const orderedDays = computed(() => [...props.plan.days].sort((left, right) => left.date.localeCompare(right.date)));
const scheduledStopCount = computed(() => orderedDays.value.reduce((total, day) => total + day.stops.length, 0));

const statusLabels: Record<PlanResult['status'], string> = {
  feasible: '可以执行',
  needs_review: '需要检查',
  infeasible: '存在冲突',
};

const modeLabels: Record<TravelMode, string> = {
  walk: '步行',
  bus: '公交',
  taxi: '出租车',
};

const estimateLabels: Record<KnownStatus, string> = {
  verified: '已核验',
  estimated: '预计',
  unknown: '未知',
};

const severityLabels: Record<PlanWarning['severity'], string> = {
  info: '提示',
  warning: '警告',
  error: '错误',
};

const warningLabels: Record<WarningCode, string> = {
  CLOSED: '关闭',
  LAST_ENTRY: '超过最晚入场',
  DAY_END: '超出每日窗口',
  OVERLAP: '时间冲突',
  BUDGET: '超出预算',
  UNKNOWN_HOURS: '开放时间未知',
  UNKNOWN_TRAVEL: '交通估算未知',
  UNKNOWN_PRICE: '价格未知',
  UNSCHEDULED: '未安排',
  UNKNOWN_DURATION: '参观时长未知',
  UNKNOWN_FX: '汇率未知',
};

function getPoiName(poiId: string): string {
  return poiById.value.get(poiId)?.name ?? '地点资料不可用';
}

function getTravelLeg(dayIndex: number, stopIndex: number): TravelLeg | undefined {
  return orderedDays.value[dayIndex]?.legs[stopIndex];
}

function travelOrigin(leg: TravelLeg | undefined): string {
  if (!leg) return '交通资料不可用';
  if (leg.fromPoiId === null) return '从行程起点';
  return `从${getPoiName(leg.fromPoiId)}出发`;
}

function formatTime(value: string | null): string {
  return value ?? '待确定';
}

function formatDuration(value: number | null): string {
  return value === null ? '时长待确定' : `${value} 分钟`;
}

function formatCost(value: TravelLeg['estimatedCost']): string | null {
  if (value === null) return null;
  return `约 ${(value.amountMinor / 100).toFixed(2)} ${value.currency}`;
}
</script>

<template>
  <article class="itinerary-display" aria-labelledby="itinerary-heading">
    <p v-if="dataSourceLabel" class="fixture-banner">{{ dataSourceLabel }}</p>

    <header class="itinerary-hero">
      <div>
        <p class="eyebrow">MY MACAU TRIPS</p>
        <h1 id="itinerary-heading">{{ tripTitle ?? '我的澳门行程' }}</h1>
        <p class="summary-copy">按日期查看景点顺序、交通估算与需要处理的问题。</p>
      </div>

      <dl class="trip-summary" aria-label="行程摘要">
        <div>
          <dt>整体状态</dt>
          <dd :class="`status status--${plan.status}`">{{ statusLabels[plan.status] }}</dd>
        </div>
        <div>
          <dt>行程天数</dt>
          <dd>{{ orderedDays.length }} 天</dd>
        </div>
        <div>
          <dt>已安排景点</dt>
          <dd>{{ scheduledStopCount }} 个</dd>
        </div>
      </dl>
    </header>

    <section class="day-list" aria-label="按日期组织的行程">
      <article
        v-for="(day, dayIndex) in orderedDays"
        :key="day.date"
        :data-testid="`itinerary-day-${day.date}`"
        class="day-card"
      >
        <header class="day-header">
          <div>
            <p class="day-number">DAY {{ dayIndex + 1 }}</p>
            <h2 :data-testid="'day-title'">第 {{ dayIndex + 1 }} 天 · {{ day.date }}</h2>
          </div>
          <span class="stop-count">{{ day.stops.length }} 个景点</span>
        </header>

        <p v-if="day.stops.length === 0" class="empty-state">当天暂无已安排景点。</p>

        <ol v-else class="stop-list" :aria-label="`第 ${dayIndex + 1} 天景点顺序`">
          <li
            v-for="(stop, stopIndex) in day.stops"
            :key="stop.id"
            data-testid="stop-item"
            class="stop-item"
          >
            <div data-testid="travel-leg" class="travel-leg">
              <template v-if="getTravelLeg(dayIndex, stopIndex)">
                <span class="transport-mode">{{ modeLabels[getTravelLeg(dayIndex, stopIndex)!.mode] }}</span>
                <span>{{ travelOrigin(getTravelLeg(dayIndex, stopIndex)) }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ formatDuration(getTravelLeg(dayIndex, stopIndex)!.durationMinutes) }}</span>
                <span v-if="formatCost(getTravelLeg(dayIndex, stopIndex)!.estimatedCost)" aria-hidden="true">·</span>
                <span v-if="formatCost(getTravelLeg(dayIndex, stopIndex)!.estimatedCost)">
                  {{ formatCost(getTravelLeg(dayIndex, stopIndex)!.estimatedCost) }}
                </span>
                <span class="estimate-status">
                  {{ estimateLabels[getTravelLeg(dayIndex, stopIndex)!.estimateStatus] }}
                </span>
              </template>
              <span v-else>交通资料不可用</span>
            </div>

            <div class="stop-content">
              <span class="stop-index" aria-hidden="true">{{ String(stopIndex + 1).padStart(2, '0') }}</span>
              <div class="stop-main">
                <div class="stop-heading">
                  <h3>{{ getPoiName(stop.poiId) }}</h3>
                  <span v-if="!poiById.get(stop.poiId)" class="missing-label">地点资料不可用</span>
                </div>

                <dl class="time-grid">
                  <div>
                    <dt>预计到达</dt>
                    <dd>{{ formatTime(stop.arrive) }}</dd>
                  </div>
                  <div>
                    <dt>开始</dt>
                    <dd>{{ formatTime(stop.start) }}</dd>
                  </div>
                  <div>
                    <dt>结束</dt>
                    <dd>{{ formatTime(stop.end) }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </li>
        </ol>
      </article>
    </section>

    <section class="attention-grid" aria-label="未安排景点和行程提醒">
      <article class="attention-card">
        <div class="attention-heading">
          <p class="eyebrow">UNSCHEDULED</p>
          <h2>未安排景点</h2>
        </div>

        <p v-if="plan.unscheduled.length === 0" class="empty-state">所有选中景点均已进入日程。</p>
        <ul v-else class="attention-list">
          <li
            v-for="item in plan.unscheduled"
            :key="`${item.poiId}-${item.code}`"
            data-testid="unscheduled-item"
          >
            <strong>{{ getPoiName(item.poiId) }}</strong>
            <span>{{ warningLabels[item.code] }} · {{ item.reason }}</span>
          </li>
        </ul>
      </article>

      <article class="attention-card">
        <div class="attention-heading">
          <p class="eyebrow">WARNINGS</p>
          <h2>行程提醒</h2>
        </div>

        <p v-if="plan.warnings.length === 0" class="empty-state">当前没有行程提醒。</p>
        <ul v-else data-testid="warning-list" class="attention-list">
          <li
            v-for="(warning, warningIndex) in plan.warnings"
            :key="`${warning.code}-${warning.poiId ?? 'global'}-${warningIndex}`"
            data-testid="warning-item"
            :class="`warning warning--${warning.severity}`"
          >
            <span class="warning-meta">
              {{ severityLabels[warning.severity] }} · {{ warningLabels[warning.code] }}
            </span>
            <strong v-if="warning.poiId">{{ getPoiName(warning.poiId) }}</strong>
            <span>{{ warning.message }}</span>
          </li>
        </ul>
      </article>
    </section>
  </article>
</template>

<style scoped>
.itinerary-display {
  --ink: #15332f;
  --muted: #5d706d;
  --line: #d8e4df;
  --surface: #ffffff;
  --wash: #f2f7f4;
  --accent: #116b5c;
  --accent-soft: #dcefe8;
  --warm: #a95418;
  --danger: #a12d2d;
  color: var(--ink);
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  max-width: 1080px;
  margin: 0 auto;
  padding: 48px 24px 72px;
}

.fixture-banner {
  margin: 0 0 24px;
  border: 1px solid #d5c39c;
  border-radius: 10px;
  background: #fff8e8;
  color: #654a17;
  padding: 10px 14px;
  font-size: 13px;
}

.itinerary-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, 1fr);
  gap: 32px;
  align-items: end;
  border-bottom: 1px solid var(--line);
  padding-bottom: 30px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 12px;
  font-size: clamp(34px, 6vw, 56px);
  line-height: 1.04;
  letter-spacing: -0.04em;
}

.summary-copy {
  max-width: 520px;
  margin-bottom: 0;
  color: var(--muted);
  line-height: 1.6;
}

.trip-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  overflow: hidden;
}

.trip-summary > div {
  padding: 18px;
}

.trip-summary > div + div {
  border-left: 1px solid var(--line);
}

.trip-summary dt,
.time-grid dt {
  color: var(--muted);
  font-size: 11px;
}

.trip-summary dd {
  margin: 7px 0 0;
  font-weight: 750;
}

.status--feasible {
  color: var(--accent);
}

.status--needs_review {
  color: var(--warm);
}

.status--infeasible {
  color: var(--danger);
}

.day-list {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}

.day-card {
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
  padding: 24px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

.day-number {
  margin-bottom: 4px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.day-header h2 {
  margin-bottom: 0;
  font-size: 21px;
}

.stop-count {
  flex: none;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 700;
}

.stop-list,
.attention-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.stop-item + .stop-item {
  margin-top: 20px;
}

.travel-leg {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin: 0 0 9px 44px;
  color: var(--muted);
  font-size: 12px;
}

.transport-mode {
  border-radius: 999px;
  background: var(--wash);
  color: var(--ink);
  padding: 3px 8px;
  font-weight: 750;
}

.estimate-status {
  border-left: 1px solid var(--line);
  padding-left: 8px;
}

.stop-content {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
}

.stop-index {
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

.stop-main {
  display: grid;
  grid-template-columns: minmax(190px, 1fr) minmax(310px, 1.2fr);
  gap: 22px;
  align-items: center;
  border-bottom: 1px dashed var(--line);
  padding: 0 0 20px;
}

.stop-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.stop-heading h3 {
  margin-bottom: 0;
  font-size: 18px;
}

.missing-label {
  color: var(--danger);
  font-size: 11px;
  font-weight: 700;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.time-grid > div {
  border-radius: 10px;
  background: var(--wash);
  padding: 10px 12px;
}

.time-grid dd {
  margin: 5px 0 0;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.attention-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.attention-card {
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
  padding: 24px;
}

.attention-heading h2 {
  margin-bottom: 16px;
  font-size: 20px;
}

.attention-list {
  display: grid;
  gap: 10px;
}

.attention-list li {
  display: grid;
  gap: 4px;
  border-radius: 12px;
  background: var(--wash);
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.45;
}

.attention-list li > span:last-child {
  color: var(--muted);
}

.warning-meta {
  color: var(--warm);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.warning--error .warning-meta {
  color: var(--danger);
}

.warning--info .warning-meta {
  color: var(--accent);
}

.empty-state {
  margin-bottom: 0;
  color: var(--muted);
}

@media (max-width: 760px) {
  .itinerary-display {
    padding: 28px 16px 48px;
  }

  .itinerary-hero,
  .attention-grid,
  .stop-main {
    grid-template-columns: 1fr;
  }

  .trip-summary {
    grid-template-columns: 1fr;
  }

  .trip-summary > div + div {
    border-top: 1px solid var(--line);
    border-left: 0;
  }

  .day-card,
  .attention-card {
    padding: 18px;
  }

  .travel-leg {
    margin-left: 0;
  }
}
</style>

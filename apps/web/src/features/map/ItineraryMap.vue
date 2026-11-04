<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L, { type LayerGroup, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ItineraryDay, PlanResult, POI } from '@tripmate/contracts';

const props = defineProps<{
  plan: PlanResult;
  pois: POI[];
  selectedDate?: string;
  dataSourceLabel?: string;
}>();

const emit = defineEmits<{
  'update:selectedDate': [date: string];
}>();

const mapElement = ref<HTMLDivElement | null>(null);

const poiById = computed(() => new Map(props.pois.map((poi) => [poi.id, poi])));
const orderedDays = computed(() =>
  [...props.plan.days].sort((left, right) => left.date.localeCompare(right.date)),
);
const activeDate = ref(props.selectedDate ?? orderedDays.value[0]?.date ?? '');
const activeDay = computed(
  () => orderedDays.value.find((day) => day.date === activeDate.value) ?? orderedDays.value[0],
);
const stopRows = computed(() => {
  const day = activeDay.value;
  if (!day) return [];
  return day.stops.map((stop, index) => ({
    stop,
    sequence: index + 1,
    poi: poiById.value.get(stop.poiId),
    positionValid: hasValidCoordinates(poiById.value.get(stop.poiId)?.position),
  }));
});

let leafletMap: LeafletMap | undefined;
let routeLayer: LayerGroup | undefined;

function configureMap(): void {
  if (!mapElement.value || leafletMap) return;

  leafletMap = L.map(mapElement.value, {
    zoomControl: true,
    attributionControl: true,
  }).setView([22.1987, 113.5439], 12);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(leafletMap);

  routeLayer = L.layerGroup().addTo(leafletMap);
}

function markerIcon(sequence: number, poi: POI): L.DivIcon {
  const badge = document.createElement('span');
  badge.className = 'map-stop-marker__badge';
  badge.dataset.testid = 'map-stop-marker';
  badge.dataset.sequence = String(sequence);
  badge.dataset.poiId = poi.id;
  badge.textContent = String(sequence);
  badge.setAttribute('aria-label', `第 ${sequence} 站：${poi.name}`);
  badge.title = `第 ${sequence} 站：${poi.name}`;

  return L.divIcon({
    className: 'map-stop-marker',
    html: badge,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function hasValidCoordinates(position: POI['position'] | undefined): boolean {
  if (!position) return false;
  return (
    Number.isFinite(position.lat) &&
    Number.isFinite(position.lng) &&
    position.lat >= -90 &&
    position.lat <= 90 &&
    position.lng >= -180 &&
    position.lng <= 180
  );
}

function getCoordinate(poi: POI | undefined): L.LatLngExpression | null {
  return poi && hasValidCoordinates(poi.position)
    ? [poi.position.lat, poi.position.lng]
    : null;
}

function renderMap(day: ItineraryDay | undefined): void {
  if (!leafletMap || !routeLayer) return;

  routeLayer.clearLayers();
  if (!day) return;

  const coordinates: L.LatLngExpression[] = [];
  let previousCoordinate: L.LatLngExpression | null = null;

  day.stops.forEach((stop, index) => {
    const poi = poiById.value.get(stop.poiId);
    const coordinate = getCoordinate(poi);

    if (!poi || !coordinate) {
      previousCoordinate = null;
      return;
    }

    coordinates.push(coordinate);

    const marker = L.marker(coordinate, {
      icon: markerIcon(index + 1, poi),
      title: `第 ${index + 1} 站：${poi.name}`,
      keyboard: true,
    });
    const tooltip = document.createElement('span');
    tooltip.textContent = `第 ${index + 1} 站 · ${poi.name}`;
    marker.bindTooltip(tooltip, {
      direction: 'top',
      offset: [0, -18],
    }).addTo(routeLayer!);

    if (previousCoordinate) {
      L.polyline([previousCoordinate, coordinate], {
        color: '#116b5c',
        weight: 4,
        opacity: 0.74,
      }).addTo(routeLayer!);
    }

    previousCoordinate = coordinate;
  });

  if (coordinates.length > 1) {
    leafletMap.fitBounds(L.latLngBounds(coordinates), {
      padding: [44, 44],
      maxZoom: 15,
    });
  } else if (coordinates[0]) {
    leafletMap.setView(coordinates[0], 15);
  } else {
    leafletMap.setView([22.1987, 113.5439], 12);
  }
}

function selectDay(date: string): void {
  activeDate.value = date;
  emit('update:selectedDate', date);
}

watch(
  () => props.selectedDate,
  (date) => {
    if (date && date !== activeDate.value) activeDate.value = date;
  },
);

watch(
  orderedDays,
  (days) => {
    if (!days.some((day) => day.date === activeDate.value)) {
      activeDate.value = days[0]?.date ?? '';
    }
  },
  { immediate: true },
);

watch(
  [activeDay, poiById],
  ([day]) => renderMap(day),
  { deep: true, flush: 'post' },
);

onMounted(async () => {
  await nextTick();
  configureMap();
  renderMap(activeDay.value);
  requestAnimationFrame(() => leafletMap?.invalidateSize());
});

onBeforeUnmount(() => {
  leafletMap?.remove();
  leafletMap = undefined;
  routeLayer = undefined;
});
</script>

<template>
  <section class="itinerary-map" aria-labelledby="itinerary-map-heading">
    <p v-if="dataSourceLabel" class="fixture-banner">{{ dataSourceLabel }}</p>

    <header class="map-heading">
      <div>
        <p class="eyebrow">ITINERARY GEOGRAPHY</p>
        <h1 id="itinerary-map-heading">行程地图</h1>
        <p class="intro">编号 marker、行程站点和路线顺序始终来自同一份 PlanResult。</p>
        <p data-testid="route-disclaimer" class="route-disclaimer">
          连线仅表示行程顺序，不代表真实道路路线。
        </p>
      </div>
      <span class="order-note">编号 = 当前日行程顺序</span>
    </header>

    <div class="day-tabs" role="group" aria-label="选择行程日期">
      <button
        v-for="(day, index) in orderedDays"
        :key="day.date"
        type="button"
        :aria-label="`第 ${index + 1} 天 ${day.date}`"
        :aria-pressed="day.date === activeDate"
        :class="{ active: day.date === activeDate }"
        @click="selectDay(day.date)"
      >
        <span>第 {{ index + 1 }} 天</span>
        <strong>{{ day.date }}</strong>
        <small>{{ day.stops.length }} 站</small>
      </button>
    </div>

    <div class="map-layout">
      <div
        ref="mapElement"
        data-testid="itinerary-map"
        class="map-canvas"
        role="region"
        aria-label="澳门行程地理地图"
      ></div>

      <aside class="map-sequence" aria-label="地图站点顺序">
        <div class="sequence-heading">
          <p class="eyebrow">STOP ORDER</p>
          <h2>{{ activeDay?.date ?? '暂无日期' }}</h2>
        </div>

        <p v-if="stopRows.length === 0" class="empty-state">当天暂无已安排景点。</p>

        <ol v-else class="sequence-list">
          <li
            v-for="row in stopRows"
            :key="row.stop.id"
            data-testid="map-stop-row"
            :data-sequence="row.sequence"
            :data-poi-id="row.stop.poiId"
          >
            <span class="sequence-number" aria-hidden="true">{{ row.sequence }}</span>
            <div>
              <strong>{{ row.poi?.name ?? '地点坐标不可用' }}</strong>
              <small v-if="row.poi && row.positionValid">
                {{ row.stop.start ?? '待确定' }} - {{ row.stop.end ?? '待确定' }}
              </small>
              <small v-else-if="row.poi" class="missing">
                地点坐标无效，请检查经纬度数据后重新加载地图。
              </small>
              <small v-else class="missing">地点坐标不可用，请检查 POI 数据后重新加载地图。</small>
            </div>
          </li>
        </ol>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.itinerary-map {
  --ink: #15332f;
  --muted: #5d706d;
  --line: #d8e4df;
  --surface: #ffffff;
  --wash: #f2f7f4;
  --accent: #116b5c;
  --accent-soft: #dcefe8;
  color: var(--ink);
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  max-width: 1180px;
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

.map-heading {
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
  margin-bottom: 0;
  color: var(--muted);
  line-height: 1.55;
}

.route-disclaimer {
  margin: 10px 0 0;
  color: #835c20;
  font-size: 12px;
  font-weight: 650;
}

.order-note {
  flex: none;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 750;
}

.day-tabs {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 22px 0;
}

.day-tabs button {
  display: grid;
  grid-template-columns: auto auto;
  gap: 2px 14px;
  flex: none;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  color: var(--ink);
  padding: 12px 15px;
  text-align: left;
  cursor: pointer;
}

.day-tabs button:hover,
.day-tabs button:focus-visible {
  border-color: var(--accent);
  outline: none;
}

.day-tabs button.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.day-tabs span,
.day-tabs small {
  font-size: 10px;
}

.day-tabs strong {
  font-size: 12px;
}

.day-tabs small {
  grid-column: 2;
  opacity: 0.72;
}

.map-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(270px, 0.75fr);
  gap: 18px;
}

.map-canvas {
  min-height: 520px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: #dfe8e3;
  overflow: hidden;
}

.map-sequence {
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
  padding: 22px;
}

.sequence-heading h2 {
  margin-bottom: 16px;
  font-size: 19px;
}

.sequence-list {
  display: grid;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sequence-list li {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border-radius: 12px;
  background: var(--wash);
  padding: 11px 12px;
}

.sequence-list li > div {
  display: grid;
  gap: 3px;
}

.sequence-list strong {
  font-size: 13px;
}

.sequence-list small {
  color: var(--muted);
  font-size: 11px;
}

.sequence-list .missing {
  color: #9d3d22;
}

.sequence-number {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.empty-state {
  color: var(--muted);
}

:global(.map-stop-marker) {
  background: transparent;
  border: 0;
}

:global(.map-stop-marker__badge) {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 3px solid #fff;
  border-radius: 50%;
  background: #116b5c;
  color: #fff;
  box-shadow: 0 5px 14px rgb(21 51 47 / 30%);
  font: 800 13px/1 "Segoe UI", sans-serif;
}

@media (max-width: 820px) {
  .itinerary-map {
    padding: 28px 16px 44px;
  }

  .map-heading {
    align-items: start;
    flex-direction: column;
  }

  .map-layout {
    grid-template-columns: 1fr;
  }

  .map-canvas {
    min-height: 420px;
  }
}
</style>

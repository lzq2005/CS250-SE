<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Category, CreateTripRequest, Currency, OriginOption, TripConfig } from '@tripmate/contracts';
import { tripApi, TripApiError } from './api';
const props = defineProps<{ initialTrip?: TripConfig }>();
const emit = defineEmits<{ saved: [trip: TripConfig] }>();
const title = ref(''), startDate = ref(''), endDate = ref(''), id = ref('');
const windows = ref<TripConfig['dayWindows']>([]), interests = ref<Category[]>([]);
const origins = ref<OriginOption[]>([]), selectedOrigin = ref(''), manualLabel = ref(''), lat = ref(''), lng = ref('');
const budget = ref(''), currency = ref<Currency>('MOP'), message = ref(''), error = ref(''), busy = ref(false);
const trips = ref<TripConfig[]>([]), selectedTrip = ref('');
const categories: Category[] = ['history', 'food', 'shopping', 'nature'];
function reset() {
  id.value = ''; title.value = ''; startDate.value = ''; endDate.value = ''; windows.value = []; interests.value = [];
  selectedOrigin.value = ''; manualLabel.value = ''; lat.value = ''; lng.value = ''; budget.value = ''; message.value = ''; error.value = '';
}
function datesChanged() {
  const start = Date.parse(`${startDate.value}T00:00:00Z`), end = Date.parse(`${endDate.value}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return;
  // Avoid freezing a browser on accidentally typed multi-century ranges; API has no artificial trip cap.
  if ((end - start) / 86400000 > 366) { error.value = '表单暂支持最多367天；请缩小日期范围。'; return; }
  const old = new Map(windows.value.map(w => [w.date, w]));
  windows.value = Array.from({ length: (end - start) / 86400000 + 1 }, (_, i) => {
    const date = new Date(start + i * 86400000).toISOString().slice(0, 10); return old.get(date) ?? { date, start: '', end: '' };
  });
}
function fill(t: TripConfig) {
  id.value = t.id; title.value = t.title; startDate.value = t.startDate; endDate.value = t.endDate;
  windows.value = t.dayWindows.map(w => ({ ...w })); interests.value = [...t.interests];
  const o = origins.value.find(o => o.label === t.origin.label && Math.abs(o.position.lat - t.origin.position.lat) < 1e-7 && Math.abs(o.position.lng - t.origin.position.lng) < 1e-7);
  selectedOrigin.value = t.origin.source === 'curated' && o ? o.id : 'manual';
  manualLabel.value = t.origin.label; lat.value = String(t.origin.position.lat); lng.value = String(t.origin.position.lng);
  budget.value = t.budget === null ? '' : `${Math.floor(t.budget.amountMinor / 100)}.${String(t.budget.amountMinor % 100).padStart(2, '0')}`;
  currency.value = t.budget?.currency ?? 'MOP';
}
function report(e: unknown) {
  error.value = e instanceof Error ? e.message : '服务暂时不可用，请重试。';
  if (e instanceof TripApiError && Array.isArray(e.details?.fields)) error.value += ' ' + e.details.fields.map(f => `${f.path}: ${f.reason}`).join('；');
}
async function load() {
  if (!selectedTrip.value) return; busy.value = true; error.value = ''; message.value = '';
  try { fill(await tripApi.get(selectedTrip.value)); message.value = '已载入旅行信息'; } catch (e) { report(e); } finally { busy.value = false; }
}
async function save() {
  error.value = ''; message.value = '';
  if (!title.value.trim() || !startDate.value || !endDate.value || startDate.value > endDate.value) { error.value = '请填写名称及有效的起止日期。'; return; }
  if (!windows.value.length || windows.value.some(w => !w.start || !w.end || w.start >= w.end || Number(w.start.slice(3)) % 15 || Number(w.end.slice(3)) % 15)) { error.value = '每天须填写15分钟粒度的有效时间窗口，结束晚于开始。'; return; }
  const chosen = origins.value.find(o => o.id === selectedOrigin.value);
  if (!chosen && (selectedOrigin.value !== 'manual' || !manualLabel.value.trim() || !String(lat.value).trim() || !String(lng.value).trim() || !Number.isFinite(Number(lat.value)) || !Number.isFinite(Number(lng.value)))) { error.value = '请选择出发点，或填写手动位置的名称和坐标。'; return; }
  let money: TripConfig['budget'] = null;
  if (budget.value !== '') {
    if (!/^\d+(?:\.\d{1,2})?$/.test(budget.value)) { error.value = '预算须为非负金额，最多两位小数。'; return; }
    const [whole, fraction = ''] = budget.value.split('.');
    const minor = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
    if (minor > BigInt(Number.MAX_SAFE_INTEGER)) { error.value = '预算超出支持范围。'; return; }
    money = { amountMinor: Number(minor), currency: currency.value };
  }
  const body: CreateTripRequest = { title: title.value, startDate: startDate.value, endDate: endDate.value,
    origin: chosen ? { label: chosen.label, position: chosen.position, source: 'curated' } : { label: manualLabel.value, position: { lat: Number(lat.value), lng: Number(lng.value) }, source: 'manual' },
    dayWindows: windows.value, interests: interests.value, budget: money, pace: 'standard' };
  busy.value = true;
  try {
    const saved = id.value ? await tripApi.patch(id.value, body) : await tripApi.create(body);
    fill(saved); emit('saved', saved); message.value = '旅行已保存';
    try { trips.value = (await tripApi.list()).items; } catch { message.value += '；列表刷新失败，可稍后重新载入。'; }
  } catch (e) { report(e); } finally { busy.value = false; }
}
onMounted(async () => {
  busy.value = true;
  try { origins.value = (await tripApi.origins()).items; trips.value = (await tripApi.list()).items; if (props.initialTrip) fill(props.initialTrip); }
  catch (e) { report(e); } finally { busy.value = false; }
});
</script>
<template>
  <section class="trip-setup" aria-label="旅行信息设置">
    <h1>旅行信息设置</h1><p>澳门本地时间 · 每天从同一位置出发</p>
    <div class="trip-load"><label>已保存的旅行<select v-model="selectedTrip" aria-label="已保存的旅行"><option value="">选择旅行</option><option v-for="t in trips" :key="t.id" :value="t.id">{{ t.title }}</option></select></label><button :disabled="busy || !selectedTrip" @click="load">载入旅行</button><button :disabled="busy" @click="reset">新建旅行</button></div>
    <p v-if="error" role="alert">{{ error }}</p><p role="status">{{ message }}</p>
    <form @submit.prevent="save"><fieldset :disabled="busy"><legend>{{ id ? '编辑旅行' : '新建旅行' }}</legend>
      <label>旅行名称<input v-model="title" required /></label>
      <label>开始日期<input v-model="startDate" type="date" required @change="datesChanged" /></label>
      <label>结束日期<input v-model="endDate" type="date" required @change="datesChanged" /></label>
      <fieldset><legend>每日游玩时间</legend><p v-if="!windows.length">先选择日期，再逐日填写时间。</p><div v-for="w in windows" :key="w.date" class="trip-day"><span>{{ w.date }}</span><label>开始 {{ w.date }}<input v-model="w.start" type="time" step="900" required /></label><label>结束 {{ w.date }}<input v-model="w.end" type="time" step="900" required /></label></div></fieldset>
      <label>澳门出发点<select v-model="selectedOrigin" aria-label="澳门出发点" required><option value="">请选择</option><option v-for="o in origins" :key="o.id" :value="o.id">{{ o.label }}</option><option value="manual">手动输入澳门位置</option></select></label>
      <fieldset v-if="selectedOrigin === 'manual'"><legend>手动位置（WGS84）</legend><label>位置名称<input v-model="manualLabel" required /></label><label>纬度<input v-model="lat" type="number" step="any" required /></label><label>经度<input v-model="lng" type="number" step="any" required /></label><p>仅接受已核实澳门陆地区域内的位置；无法确认的点位会提示重新选择。</p></fieldset>
      <fieldset><legend>偏好（可不选）</legend><label v-for="c in categories" :key="c" class="trip-check"><input v-model="interests" type="checkbox" :value="c" />{{ c }}</label></fieldset>
      <label>预算（留空表示未设置）<input v-model="budget" inputmode="decimal" /></label><label>预算币种<select v-model="currency" aria-label="预算币种"><option>MOP</option><option>HKD</option><option>CNY</option></select></label>
      <p>节奏：标准。舒缓节奏尚未启用。预算仅为输入约束，不提供实时汇率。</p>
      <button type="submit">{{ busy ? '正在保存…' : '保存旅行' }}</button>
    </fieldset></form>
  </section>
</template>
<style scoped>
.trip-setup{max-width:760px;margin:2rem auto;padding:1.5rem;color:#173530;font-family:system-ui;background:#fff;border:1px solid #d4e3df;border-radius:16px}.trip-setup h1{font-size:1.8rem}.trip-setup label{display:grid;gap:.4rem;margin:.8rem 0}.trip-setup input,.trip-setup select,.trip-setup button{font:inherit;padding:.65rem;border:1px solid #9dafaa;border-radius:6px}.trip-setup button{background:#145e50;color:white;cursor:pointer;margin:.5rem}.trip-setup button:disabled{opacity:.5}.trip-setup fieldset{border:1px solid #ccdcd6;margin:1rem 0;padding:1rem;min-width:0}.trip-setup .trip-day{display:flex;gap:1rem;flex-wrap:wrap;align-items:center}.trip-setup .trip-check{display:inline-flex;align-items:center;margin-right:1rem}.trip-setup [role=alert]{color:#a02020;white-space:pre-wrap}.trip-setup [role=status]{color:#145e50}.trip-setup input:focus,.trip-setup select:focus,.trip-setup button:focus{outline:3px solid #69b5a3;outline-offset:2px}
</style>

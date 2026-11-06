<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { TargetsView } from '@tripmate/contracts';
import { activeTrip } from '../../shared/active-trip';
import { addTarget, getTargets, removeTarget, TargetsError } from './targets.api';
const props = defineProps<{ poiId: string }>();
const trip = activeTrip.state;
const view = ref<TargetsView | null>(null);
const loading = ref(false);
const mutating = ref(false);
const error = ref('');
const message = ref('');
const selected = computed(() => view.value?.poiIds.includes(props.poiId) ?? false);
let version = 0;
let controller: AbortController | undefined;
async function load() {
  const current = ++version;
  controller?.abort(); controller = new AbortController();
  view.value = null; error.value = ''; message.value = ''; mutating.value = false; loading.value = false;
  if (trip.value.status !== 'ready' || !trip.value.id) return;
  const id = trip.value.id;
  loading.value = true;
  try {
    const result = await getTargets(id, controller.signal);
    if (current === version) view.value = result;
  } catch (cause) {
    if (current === version) error.value = cause instanceof TargetsError && cause.status === 404
      ? '目标地点服务或旅行不可用，请重试；此响应不能单独证明旅行已删除。' : '目标地点暂时无法读取，请重试。';
  } finally { if (current === version) loading.value = false; }
}
async function mutate() {
  if (trip.value.status !== 'ready' || !trip.value.id || !view.value || loading.value || mutating.value) return;
  const current = version, id = trip.value.id, poiId = props.poiId, removing = selected.value;
  mutating.value = true; error.value = ''; message.value = '';
  try {
    const result = await (removing ? removeTarget : addTarget)(id, poiId, controller?.signal);
    if (current === version) { view.value = result; message.value = removing ? '已从当前旅行移除。' : '已加入当前旅行。'; }
  } catch (cause) {
    if (current !== version) return;
    if (cause instanceof TargetsError && cause.status === 409 && cause.code === 'DUPLICATE_TARGET') {
      await load();
      if (trip.value.id === id && props.poiId === poiId && view.value) message.value = '这个地点已经加入当前旅行。';
    } else if (cause instanceof TargetsError && cause.status === 404) {
      // POST's 404 can refer to either Trip or POI. Revalidate Trip through A's GET.
      await activeTrip.restore();
      if (trip.value.id === id && trip.value.status === 'ready' && props.poiId === poiId) {
        await load();
        if (trip.value.id === id && props.poiId === poiId) error.value = '旅行仍然有效；地点或目标服务不可用，请刷新资料后重试。';
      }
    } else {
      view.value = null;
      error.value = '操作结果未确认。请先重新读取目标，避免重复提交。';
    }
  } finally { if (current === version) mutating.value = false; }
}
watch(() => [trip.value.id, trip.value.status, props.poiId], () => { void load(); }, { immediate: true });
onUnmounted(() => { version++; controller?.abort(); });
</script>
<template>
  <section class="target-actions" aria-label="当前旅行目标" :aria-busy="loading || mutating">
    <template v-if="trip.status === 'ready'">
      <p>加入旅行：<strong>{{ trip.trip?.title }}</strong></p>
      <p v-if="loading" role="status">正在读取已选地点…</p>
      <p v-else-if="view">当前旅行已选 {{ view.poiIds.length }} 个地点<span v-if="selected">；此地点已加入（第 {{ view.poiIds.indexOf(poiId) + 1 }} 个）</span>。</p>
      <button :disabled="!view || loading || mutating" @click="mutate">{{ mutating ? '正在提交…' : selected ? '从当前旅行移除' : '加入当前旅行' }}</button>
      <button v-if="error" :disabled="loading || mutating" @click="load">重新读取目标</button>
      <p v-if="error" role="alert">{{ error }}</p><p v-if="message" role="status">{{ message }}</p>
    </template>
    <p v-else-if="trip.status === 'restoring'">正在恢复旅行，暂不能添加地点。</p>
    <p v-else-if="trip.status === 'unavailable'">当前旅行暂时无法验证，请先在旅行设置中重试。</p>
    <p v-else>先<a href="#/trip">设置当前旅行</a>，再加入地点。</p>
    <small>加入或移除目标不会更改收藏，也不会改写已保存的行程。</small>
  </section>
</template>
<style scoped>
.target-actions{margin-top:24px;padding:20px;border:1px solid #d5e5f6;border-radius:16px;background:#f7fbff;overflow-wrap:anywhere}.target-actions p{line-height:1.7}.target-actions button{min-height:44px;padding:10px 16px;border:1px solid #b9cfe7;border-radius:10px;background:white;color:#245989;margin:0 8px 8px 0;font:inherit;cursor:pointer}.target-actions button:disabled{opacity:.55;cursor:wait}.target-actions a{color:#246ec0;text-decoration:underline}.target-actions small{display:block;color:#526b87;line-height:1.6}.target-actions [role=alert]{color:#9b3d31}
</style>

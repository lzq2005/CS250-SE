<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { FavoriteState } from '@tripmate/contracts';
import { getFavorite, putFavorite, deleteFavorite } from './favorites.api';
// knownFavorite is supplied only by the validated favoriteOnly list, avoiding N GETs.
// Explicit undefined avoids Vue casting an absent Boolean prop to false.
const props = withDefaults(defineProps<{ poiId: string; poiName: string; knownFavorite?: boolean }>(), { knownFavorite: undefined });
const emit = defineEmits<{ changed: [state: FavoriteState] }>();
const favorited = ref(false), confirmed = ref(false), busy = ref(false);
const error = ref(''), message = ref('');
const label = computed(() => busy.value ? '正在处理收藏…' : favorited.value ? '取消收藏' : '收藏此地点');
let version = 0;
let controller: AbortController | undefined;
async function read() {
  const current = ++version;
  controller?.abort(); controller = new AbortController();
  confirmed.value = false; busy.value = true; error.value = ''; message.value = '';
  try {
    const state = await getFavorite(props.poiId, controller.signal);
    if (current === version) { favorited.value = state.favorited; confirmed.value = true; }
  } catch (cause) {
    if (current === version) error.value = cause instanceof Error ? cause.message : '收藏状态暂时不可用。';
  } finally { if (current === version) busy.value = false; }
}
async function toggle() {
  if (!confirmed.value || busy.value) return;
  const current = version, poiId = props.poiId, removing = favorited.value;
  busy.value = true; error.value = ''; message.value = '';
  try {
    const state = await (removing ? deleteFavorite : putFavorite)(poiId, controller?.signal);
    if (current === version) { favorited.value = state.favorited; message.value = state.favorited ? '已收藏。' : '已取消收藏。'; emit('changed', state); }
  } catch {
    if (current === version) { confirmed.value = false; error.value = '操作结果未确认，请先重新读取收藏状态。'; }
  } finally { if (current === version) busy.value = false; }
}
watch(() => [props.poiId, props.knownFavorite], () => {
  if (props.knownFavorite === undefined) { void read(); return; }
  version++; controller?.abort(); controller = new AbortController();
  favorited.value = props.knownFavorite; confirmed.value = true; busy.value = false; error.value = ''; message.value = '';
}, { immediate: true });
onUnmounted(() => { version++; controller?.abort(); });
</script>
<template>
  <section class="favorite-action" aria-label="地点收藏操作" :aria-busy="busy">
    <button :disabled="busy || !confirmed" :aria-label="`${label}：${poiName}`" :aria-pressed="confirmed ? favorited : undefined" @click="toggle">{{ label }}</button>
    <button v-if="error" :disabled="busy" @click="read">重新读取收藏状态</button>
    <p v-if="error" role="alert">{{ error }}</p><p v-if="message" role="status">{{ message }}</p>
  </section>
</template>
<style scoped>
.favorite-action{margin-top:16px;overflow-wrap:anywhere}.favorite-action button{font:inherit;min-height:44px;margin:0 8px 8px 0;padding:10px 16px;border-radius:10px;border:1px solid #c8d9ec;background:#fff;color:#285888;cursor:pointer}.favorite-action button[aria-pressed=true]{background:#ffedf0;color:#a63955;border-color:#efc4cf}.favorite-action button:disabled{opacity:.6;cursor:wait}.favorite-action p{font-size:13px;line-height:1.6}.favorite-action [role=alert]{color:#9b3d31}
</style>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import type { Category, POI, FavoriteState } from '@tripmate/contracts';
import { listPois, getPoi } from './poi.api';
import FavoriteAction from './FavoriteAction.vue';
import type { ShellRoute } from '../../router/routes';
const props = defineProps<{ route: ShellRoute; embedded?: boolean }>();
const emit = defineEmits<{ navigate: [path: string, replace: boolean] }>();

const gateway = { list: listPois, detail: getPoi };
const categories: { id: Category | ''; label: string; symbol: string }[] = [
  { id: '', label: '全部', symbol: '✧' }, { id: 'history', label: '历史', symbol: '⌂' },
  { id: 'food', label: '美食', symbol: '♧' }, { id: 'shopping', label: '购物', symbol: '◇' },
  { id: 'nature', label: '自然', symbol: '❀' },
];
const keyword = ref('');
const category = ref<Category | ''>('');
const items = ref<POI[]>([]);
const detail = ref<POI | null>(null);
const mode = computed(() => props.route.id === 'discover' || props.route.id === 'favorites' ? 'list' : props.route.id === 'poi-detail' ? 'detail' : 'missing');
const favoritesOnly = computed(() => props.route.id === 'favorites' || new URLSearchParams(props.route.search).get('favoriteOnly') === 'true');
const listPath = computed(() => favoritesOnly.value ? '/favorites' : '/discover');
const favoriteNotice = ref('');
const loading = ref(false);
const error = ref('');
const region = ref<HTMLElement | null>(null);
let request: AbortController | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;
const query = computed(() => {
  const q = new URLSearchParams();
  if (keyword.value.trim()) q.set('search', keyword.value.trim());
  if (category.value) q.set('category', category.value);
  if (favoritesOnly.value) q.set('favoriteOnly', 'true');
  return q.toString() ? `?${q}` : '';
});
const categoryName = (value: Category) => categories.find(c => c.id === value)?.label ?? value;
const categorySymbol = (value: Category) => categories.find(c => c.id === value)?.symbol ?? '✧';
const weekdayName = (value: number) => ['一','二','三','四','五','六','日'][value - 1] ?? '未知';
const priceLabel = (poi: POI) => poi.price === null ? '费用未知' : poi.price.amountMinor === 0 ? '免费' : `${(poi.price.amountMinor / 100).toFixed(2)} ${poi.price.currency}`;

async function loadRoute(focus = true) {
  clearTimeout(searchTimer);
  request?.abort();
  request = new AbortController();
  const current = ++sequence;
  const selectedRoute = props.route;
  const params = new URLSearchParams(selectedRoute.search);
  keyword.value = params.get('search') ?? '';
  const selected = params.get('category') ?? '';
  category.value = categories.some(c => c.id === selected) ? selected as Category | '' : '';
  error.value = ''; favoriteNotice.value = ''; detail.value = null; loading.value = true;
  try {
    if (mode.value === 'list') {
      const result = await gateway.list({ search: keyword.value, category: category.value || undefined, ...(favoritesOnly.value ? { favoriteOnly: true } : {}) }, request.signal);
      if (current === sequence) items.value = result.items;
    } else if (mode.value === 'detail') {
      const result = await gateway.detail(selectedRoute.poiId ?? '', request.signal);
      if (current === sequence) detail.value = result;
    }
  } catch (cause) {
    if (current === sequence && !(cause instanceof DOMException && cause.name === 'AbortError')) error.value = cause instanceof Error ? cause.message : '加载失败，请重试。';
  } finally {
    if (current === sequence) {
      loading.value = false;
      if (focus) { await nextTick(); region.value?.focus({ preventScroll: true }); }
    }
  }
}
function applyQuery() {
  clearTimeout(searchTimer);
  // Shell owns navigation; this feature only requests a location change.
  emit('navigate', `${listPath.value}${query.value}`, true);
}
function favoriteChanged(state: FavoriteState) {
  if (favoritesOnly.value && mode.value === 'list' && !state.favorited) {
    items.value = items.value.filter(poi => poi.id !== state.poiId);
    favoriteNotice.value = '已取消收藏。';
  }
}
function scheduleSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(applyQuery, 200); }
function reset() { keyword.value = ''; category.value = ''; applyQuery(); }
watch(() => props.route, () => { void loadRoute(false); }, { immediate: true });
onUnmounted(() => { sequence++; request?.abort(); clearTimeout(searchTimer); });
</script>

<template>
  <div class="discovery-shell">
  <header v-if="!embedded" class="header"><a href="#/discover" class="brand">✧ TripMate <small>MACAU</small></a><span class="phase">探索澳门</span></header>
  <section class="content-region" ref="region" tabindex="-1" aria-label="景点探索">
    <section class="panel">
      <template v-if="mode === 'list'">
        <div class="intro"><p class="eyebrow">{{ favoritesOnly ? 'YOUR FAVORITE PLACES' : 'DISCOVER YOUR NEXT STOP' }}</p><h1>{{ favoritesOnly ? '地点收藏' : '发现下一处心动' }}</h1><p>{{ favoritesOnly ? '留住喜欢的地点；收藏不会自动加入本次旅行。' : '寻找喜欢的澳门地点，查看参观信息。' }}</p></div>
        <form class="search-form" role="search" @submit.prevent="applyQuery">
          <label for="poi-search" class="visually-hidden">搜索景点</label>
          <input id="poi-search" v-model="keyword" type="search" placeholder="搜索名称、地址或标签" @input="scheduleSearch">
          <button class="primary" type="submit">搜索</button>
          <button type="button" @click="reset">清除筛选</button>
        </form>
        <nav class="categories" aria-label="景点分类"><button v-for="item in categories" :key="item.id" :class="{ selected: category === item.id }" :aria-pressed="category === item.id" @click="category = item.id; applyQuery()">{{ item.symbol }} {{ item.label }}</button></nav>
      </template>
      <template v-else><a class="back" :href="`#${listPath}${query}`">{{ favoritesOnly ? '← 返回收藏列表' : '← 返回搜索结果' }}</a><p class="eyebrow">POI DETAILS</p></template>

      <div v-if="loading" class="state" role="status"><span class="spinner"></span><h2>正在加载景点资料…</h2></div>
      <div v-else-if="error" class="state error" role="alert"><h2>资料暂时无法加载</h2><p>{{ error }}</p><button @click="loadRoute(false)">重新尝试</button></div>
      <template v-else-if="mode === 'list'">
        <p class="result-count" role="status">{{ items.length }} 个地点</p>
        <p v-if="favoriteNotice" role="status">{{ favoriteNotice }}</p>
        <div v-if="!items.length" class="state"><span class="state-symbol">⌕</span><h2>{{ favoritesOnly ? '没有匹配的收藏地点' : '没有找到匹配的地点' }}</h2><p>{{ favoritesOnly ? '尚未收藏，或当前筛选下没有结果。' : '试试其他关键词，或清除筛选查看全部数据。' }}</p><button @click="reset">{{ favoritesOnly ? '清除收藏筛选' : '查看全部地点' }}</button><a v-if="favoritesOnly" class="button" href="#/discover">去发现地点</a></div>
        <div v-else class="poi-grid">
          <article v-for="poi in items" :key="poi.id" class="poi-card">
            <div class="category-art" :class="poi.category" aria-hidden="true">{{ categorySymbol(poi.category) }}</div>
            <div class="card-body"><span class="category-label">{{ categoryName(poi.category) }}</span><h2><a :href="`#/pois/${poi.id}${query}`">{{ poi.name }}</a></h2><p class="address">{{ poi.address }}</p>
              <div class="facts"><span>{{ priceLabel(poi) }}</span><span>{{ poi.openingHours === null ? '营业时间未知' : poi.openingHours.length === 0 ? '整周关闭' : '见详情' }}</span></div>
              <a class="detail-link" :href="`#/pois/${poi.id}${query}`">查看详情 <span aria-hidden="true">→</span></a>
              <FavoriteAction v-if="favoritesOnly" :poi-id="poi.id" :poi-name="poi.name" :known-favorite="true" @changed="favoriteChanged" />
            </div>
          </article>
        </div>
      </template>
      <article v-else-if="mode === 'detail' && detail" class="detail">
        <div class="detail-heading"><span class="category-label">{{ categoryName(detail.category) }} · {{ { verified: '已核对', estimated: '估计信息', unknown: '待核实' }[detail.verification] }}</span><h1>{{ detail.name }}</h1><p>{{ detail.address }}</p></div>
        <div v-if="detail.tags.includes('SYNTHETIC_TEST_ONLY')" class="notice">仅合成测试数据，不代表真实地点，请勿用于旅行规划。</div>
        <dl class="detail-grid">
          <div><dt>营业时间</dt><dd v-if="detail.openingHours === null">未知 · 待来源核实</dd><dd v-else-if="detail.openingHours.length === 0">已知整周关闭</dd><dd v-else><p v-for="(window, index) in detail.openingHours" :key="index">周{{ weekdayName(window.weekday) }} {{ window.open }}–{{ window.close }}；最晚入场 {{ window.lastEntry ?? '未知' }}</p></dd></div>
          <div><dt>参观费用</dt><dd>{{ priceLabel(detail) }}</dd></div>
          <div><dt>建议参观时长</dt><dd>{{ detail.suggestedVisitMinutes === null ? '未知' : `${detail.suggestedVisitMinutes} 分钟` }}</dd></div>
          <div><dt>地点坐标</dt><dd>{{ detail.position.lat }}, {{ detail.position.lng }}</dd></div>
          <div><dt>资料来源</dt><dd>{{ detail.sourceUrl ?? '来源未知' }}</dd></div>
          <div><dt>核对时间</dt><dd>{{ detail.checkedAt ?? '未核对' }}</dd></div>
        </dl>
        <section class="booking"><h2>备注</h2><p>{{ detail.bookingNote ?? '暂无可靠的预约说明，不代表无需预约。' }}</p></section>
        <FavoriteAction :poi-id="detail.id" :poi-name="detail.name" />
        <div class="actions"><button disabled>＋ 加入行程（尚未接入）</button></div><p class="action-note">加入行程前端在独立分支准备，当前尚未接入。</p>
      </article>
      <div v-else class="state"><h1>地点资料未找到</h1><p>地址可能无效，返回列表继续查看。</p><a class="button" :href="`#${listPath}${query}`">回到列表</a></div>
    </section>
  </section>
  </div>
</template>

<style scoped src="./discovery.css"></style>

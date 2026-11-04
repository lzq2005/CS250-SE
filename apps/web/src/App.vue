<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { getHealth } from './api';
import AppIcon from './shared/ui/AppIcon.vue';
import { navigation, resolveRoute, shortcuts } from './router/routes';
const route = ref(resolveRoute(window.location.hash));
const main = ref<HTMLElement | null>(null);
const message = ref('正在连接服务…');
const busy = ref(false);
const connected = ref(false);
async function checkHealth() {
  busy.value = true;
  connected.value = false;
  try {
    const health = await getHealth();
    connected.value = health.database === 'ok';
    message.value = connected.value ? 'API 与数据库连接正常' : '数据库状态待确认';
  } catch (error) { message.value = error instanceof Error ? error.message : '服务暂时不可用'; }
  finally { busy.value = false; }
}
async function navigate() {
  route.value = resolveRoute(window.location.hash);
  document.title = `${route.value.title} · TripMate Macau`;
  await nextTick();
  main.value?.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}
onMounted(() => {
  window.addEventListener('hashchange', navigate);
  document.title = `${route.value.title} · TripMate Macau`;
  void checkHealth();
});
onUnmounted(() => window.removeEventListener('hashchange', navigate));
</script>
<template>
  <a class="skip-link" href="#main-content" @click.prevent="main?.focus()">跳到主要内容</a>
  <div class="app-shell">
    <header class="site-header">
      <a class="brand" href="#/home" aria-label="TripMate Macau 首页"><span class="brand-mark"><AppIcon name="compass" /></span><span>TripMate <span class="brand-city">MACAU</span></span></a>
      <span class="header-note"><span class="small-dot"></span> 澳门，自在探索</span>
    </header>
    <main id="main-content" ref="main" tabindex="-1" class="page-content">
      <div v-if="route.id === 'home'" class="home-scene">
        <section class="hero" aria-labelledby="home-title">
          <div class="hero-copy">
            <p class="eyebrow">EXPLORE MACAU · YOUR WAY</p>
            <h1 id="home-title">探索澳门，<br><span class="accent">发现属于你的旅程。</span></h1>
            <p class="hero-description">从大三巴的石阶，到街角的烟火气。<br>选一处心动的地方，开始认识这座城。</p>
          </div>
          <span class="photo-location"><AppIcon name="map" /> 大三巴牌坊 · 澳门</span>
        </section>
        <section class="journey-choices" aria-labelledby="journey-title">
          <h2 id="journey-title" class="visually-hidden">你的旅程，从这里开始</h2>
          <div class="shortcut-grid">
            <a v-for="item in shortcuts" :key="item.id" class="shortcut-card" :class="`shortcut-${item.id}`" :href="item.href">
              <span class="shortcut-icon"><AppIcon :name="item.icon" /></span>
              <span class="shortcut-text"><strong>{{ item.title }}</strong><span>{{ item.description }}</span></span>
              <AppIcon class="card-arrow" name="arrow" />
            </a>
          </div>
        </section>
      </div>
      <section v-else class="destination" aria-labelledby="destination-title">
        <a class="back-link" href="#/home">← 返回首页</a>
        <div class="destination-card">
        <p class="eyebrow">{{ route.english }}</p>
        <h1 id="destination-title">{{ route.title }}</h1>
        <p class="destination-description">{{ route.description }}</p>
        <div class="empty-panel">
          <span class="empty-icon"><AppIcon :name="route.icon" /></span>
          <h2>{{ route.id === 'not-found' ? '这个页面暂时找不到' : '这里的旅程，还在准备中' }}</h2>
          <p>{{ route.id === 'not-found' ? '请从首页或底部导航继续浏览。' : '此功能正在开发，暂不能进行实际操作。完成后会在这里开放。' }}</p>
          <a class="secondary-button" href="#/home">回到首页 <AppIcon name="arrow" /></a>
        </div>
        <nav v-if="route.id === 'mine'" class="mine-links" aria-label="我的旅程入口"><a href="#/favorites">地点收藏 <AppIcon name="heart" /></a><a href="#/trips">我的澳门行程 <AppIcon name="calendar" /></a></nav>
        </div>
      </section>
      <section class="service-details" aria-label="服务状态">
        <p><span class="small-dot" :class="{ online: connected }"></span> 服务连接状态</p>
        <div class="service-content"><p role="status">{{ message }}</p><button class="text-button" :disabled="busy" @click="checkHealth">{{ busy ? '检查中…' : '重新检查' }}</button></div>
      </section>
      <footer class="page-footer">TRIPMATE MACAU <span>用自己的方式，认识一座城。</span></footer>
      <details v-if="route.id === 'home'" class="image-info">
        <summary>图片说明</summary>
        <p>大三巴背景：<a href="https://commons.wikimedia.org/wiki/File:Ruins_of_St_Paul_2013.JPG" target="_blank" rel="noopener noreferrer">Mimihitam / Wikimedia Commons</a>，<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>。已缩小并转换为 WebP，显示区域随屏幕裁切。</p>
      </details>
    </main>
    <nav class="bottom-nav" aria-label="主导航">
      <a v-for="item in navigation" :key="item.id" :href="item.href" :aria-current="route.tab === item.id ? 'page' : undefined" :class="{ active: route.tab === item.id }"><AppIcon :name="item.icon" /><span>{{ item.title }}</span><span class="nav-english">{{ item.english }}</span></a>
    </nav>
  </div>
</template>

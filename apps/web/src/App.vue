<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getHealth } from './api';
const message = ref('正在连接服务…');
const busy = ref(false);
async function checkHealth() {
  busy.value = true;
  try { const health = await getHealth(); message.value = health.database === 'ok' ? 'API 与数据库连接正常' : '数据库状态待确认'; }
  catch (error) { message.value = error instanceof Error ? error.message : '服务暂时不可用'; }
  finally { busy.value = false; }
}
onMounted(checkHealth);
</script>
<template>
  <main class="mx-auto max-w-3xl px-6 py-16">
    <p class="mb-3 text-sm font-semibold tracking-widest text-teal-700">TRIPMATE MACAU</p>
    <h1 class="text-4xl font-bold">澳门旅程，从这里开始</h1>
    <p class="mt-5 text-lg">统一开发环境已建立，旅行规划功能正在开发中。</p>
    <section class="mt-10 rounded-2xl border border-teal-100 bg-white p-6 shadow-sm" aria-label="服务状态">
      <h2 class="text-xl font-semibold">连接状态</h2>
      <p class="mt-3" role="status">{{ message }}</p>
      <button class="mt-5 rounded-lg bg-teal-800 px-5 py-2 text-white disabled:opacity-50" :disabled="busy" @click="checkHealth">重新检查</button>
    </section>
  </main>
</template>

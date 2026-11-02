import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  return { plugins: [vue(), tailwindcss()], server: { host: env.WEB_HOST ?? '127.0.0.1', port: Number(env.WEB_PORT ?? 5173), strictPort: true, proxy: { '/api': env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001' } } };
});

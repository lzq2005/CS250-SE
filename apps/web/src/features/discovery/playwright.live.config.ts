import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../../../../../', import.meta.url));
export default defineConfig({
  testDir: './live-tests', workers: 1,
  outputDir: '../../../../../test-results/discovery-live',
  use: { baseURL: 'http://127.0.0.1:5181', browserName: 'chromium',
    ...(process.env.TRIPMATE_BROWSER_CHANNEL ? { channel: process.env.TRIPMATE_BROWSER_CHANNEL } : {}) },
  webServer: [
    { command: 'node --import tsx apps/web/src/features/discovery/live-tests/server.ts', cwd,
      env: { TRIPMATE_POI_LIVE_TEST: '1' }, url: 'http://127.0.0.1:5182/api/v1/health', reuseExistingServer: false },
    { command: 'npm run dev -w @tripmate/web -- --port 5181', cwd,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:5182' }, url: 'http://127.0.0.1:5181', reuseExistingServer: false },
  ],
});

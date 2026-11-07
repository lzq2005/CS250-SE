import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './browser-tests', workers: 1,
  outputDir: '../../../../../test-results/discovery',
  use: { baseURL: 'http://127.0.0.1:5175', browserName: 'chromium',
    ...(process.env.TRIPMATE_BROWSER_CHANNEL ? { channel: process.env.TRIPMATE_BROWSER_CHANNEL } : {}) },
  webServer: { command: 'npm run dev -w @tripmate/web -- --port 5175',
    cwd: fileURLToPath(new URL('../../../../../', import.meta.url)),
    url: 'http://127.0.0.1:5175', reuseExistingServer: false },
});

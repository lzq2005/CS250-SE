import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/e2e/*.spec.ts', 'tests/integration/*.spec.ts',
    'apps/web/src/features/discovery/live-tests/*.spec.ts', 'apps/web/src/router/tests/*.spec.ts'],
  workers: 1,
  outputDir: 'test-results/poi-integration',
  use: { baseURL: 'http://127.0.0.1:5181', browserName: 'chromium',
    ...(process.env.TRIPMATE_BROWSER_CHANNEL ? { channel: process.env.TRIPMATE_BROWSER_CHANNEL } : {}) },
  webServer: [
    { command: 'node scripts/poi-integration-server.mjs',
      env: { TRIPMATE_POI_INTEGRATION_TEST: '1' },
      url: 'http://127.0.0.1:5182/api/v1/health', reuseExistingServer: false, timeout: 120000 },
    { command: 'npm run dev -w @tripmate/web -- --port 5181',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:5182' },
      url: 'http://127.0.0.1:5181', reuseExistingServer: false },
  ],
});

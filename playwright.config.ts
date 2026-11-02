import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium' },
  webServer: [
    { command: 'npm run dev -w @tripmate/api', url: 'http://127.0.0.1:3001/api/v1/health', reuseExistingServer: !process.env.CI },
    { command: 'npm run dev -w @tripmate/web', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI }
  ]
});

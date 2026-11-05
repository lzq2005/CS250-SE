import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from '../../../../playwright.config';

// B-owned browser checks; do not modify D's shared E2E suite/config.
const cwd = fileURLToPath(new URL('../../../../', import.meta.url));
export default defineConfig({
  ...base,
  preserveOutput: 'always',
  testDir: cwd,
  testMatch: ['apps/web/src/router/tests/*.spec.ts', 'tests/e2e/*.spec.ts'],
  use: { ...base.use, channel: process.env.TRIPMATE_BROWSER_CHANNEL === 'chrome' ? 'chrome' : undefined },
  webServer: (Array.isArray(base.webServer) ? base.webServer : []).map(server => ({ ...server, cwd })),
});

import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import live from '../features/discovery/playwright.live.config';

// B-owned browser checks; do not modify D's shared E2E suite/config.
const cwd = fileURLToPath(new URL('../../../../', import.meta.url));
export default defineConfig({
  ...live,
  preserveOutput: 'always',
  testDir: cwd,
  testMatch: ['apps/web/src/router/tests/shell.spec.ts', 'tests/e2e/*.spec.ts'],
  outputDir: fileURLToPath(new URL('../../../../test-results/shell-regression', import.meta.url)),
});

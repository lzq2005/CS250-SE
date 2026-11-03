import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/fixtures/planning/**/*.test.ts'], environment: 'node' },
});

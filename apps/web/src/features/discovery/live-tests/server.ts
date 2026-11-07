// Test-only harness using the existing app factory, never a production API entry.
import process from 'node:process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

if (process.env.TRIPMATE_POI_LIVE_TEST !== '1') throw new Error('This server is only for the isolated POI integration test.');
const root = fileURLToPath(new URL('../../../../../../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'tripmate-poi-live-'));
// Set BEFORE importing A's app/db modules. Ignore any normal demo DATABASE_URL.
process.env.DATABASE_URL = `file:${join(directory, 'live.db').replaceAll('\\', '/')}`;
const { prisma } = await import('../../../../../api/src/db.js');
const { createApp } = await import('../../../../../api/src/app.js');
const { createPoisRouter } = await import('../../../../../api/src/features/pois/poi.router.js');
const { seedPois } = await import('../../../../../api/src/features/pois/poi.seed.js');

function cleanDirectory() {
  if (dirname(resolve(directory)) !== resolve(tmpdir())) throw new Error('Unexpected test cleanup path');
  rmSync(directory, { recursive: true, force: true });
}
try {
  await prisma.$queryRaw`SELECT 1`;
  const run = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'], {
    cwd: root, env: process.env, encoding: 'utf8', timeout: 30000,
  });
  if (run.status !== 0) throw new Error(`Isolated migration failed: ${run.stdout}\n${run.stderr}`);
  const data: unknown = JSON.parse(readFileSync(join(root, 'data/fixtures/pois.curated-draft.json'), 'utf8'));
  const preview = await seedPois(prisma, data);
  assert.deepEqual(preview, { dryRun: true, total: 5, created: 5, updated: 0, unchanged: 0 });
  assert.equal(await prisma.pOI.count(), 0);
  const applied = await seedPois(prisma, data, { dryRun: false });
  assert.equal(applied.created, 5);
  const repeated = await seedPois(prisma, data, { dryRun: false });
  assert.deepEqual(repeated, { dryRun: false, total: 5, created: 0, updated: 0, unchanged: 5 });
  console.log('Isolated real-POI test: preview 5, apply 5, repeat unchanged 5; normal demo database not used.');
} catch (error) {
  await prisma.$disconnect(); cleanDirectory(); throw error;
}
const server = createApp({ modules: [{ owner: 'B', router: createPoisRouter(prisma) }] }).listen(5182, '127.0.0.1');
let closing = false;
async function close() {
  if (closing) return; closing = true;
  server.close(() => { void prisma.$disconnect().finally(() => { cleanDirectory(); process.exit(0); }); });
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void close(); });
server.on('error', error => { void prisma.$disconnect().finally(() => { cleanDirectory(); throw error; }); });

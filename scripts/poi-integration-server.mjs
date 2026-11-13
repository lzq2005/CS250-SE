// Test-only setup, then run the ONE production server entry against a temporary DB.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

if (process.env.TRIPMATE_POI_INTEGRATION_TEST !== '1') throw new Error('Isolated integration test only.');
const directory = mkdtempSync(join(tmpdir(), 'tripmate-a-poi-e2e-'));
const databasePath = join(directory, 'integration.db');
process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`;
process.env.API_PORT = '5182';
process.env.API_HOST = '127.0.0.1';
process.on('exit', () => {
  if (dirname(resolve(directory)) !== resolve(tmpdir())) throw new Error('Unexpected cleanup path');
  rmSync(directory, { recursive: true, force: true });
});
function run(args) {
  const result = spawnSync(process.execPath, args, { env: process.env, encoding: 'utf8', timeout: 60000 });
  if (result.status !== 0) throw new Error(`${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const database = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
try {
  run(['scripts/database.mjs']);
  assert.equal(await database.pOI.count(), 0);
  const input = 'data/fixtures/pois.curated-draft.json';
  const cli = ['--import', 'tsx', 'apps/api/src/cli/seed-pois.ts', '--database', databasePath, '--input', input];
  run(cli); // Default dry-run of pending data is safe; isolated apply below is test-only.
  assert.equal(await database.pOI.count(), 0);
  const sha256 = createHash('sha256').update(readFileSync(input)).digest('hex');
  run([...cli, '--apply', '--approved-sha256', sha256]);
  assert.equal(await database.pOI.count(), 5);
  assert.match(run([...cli, '--apply', '--approved-sha256', sha256]), /"unchanged": 5/);
} finally { await database.$disconnect(); }
// No custom router or listener. This exercises compiled createApp() defaults.
await import('../apps/api/dist/server.js');

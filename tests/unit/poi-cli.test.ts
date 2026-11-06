import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'tripmate-a-poi-cli-'));
const databasePath = join(directory, 'cli.db');
const databaseUrl = `file:${databasePath.replaceAll('\\', '/')}`;
const db = new PrismaClient({ datasourceUrl: databaseUrl });
const inputPath = join(directory, 'synthetic.json');
const source = JSON.parse(readFileSync('data/fixtures/pois.curated-draft.json', 'utf8'));
const input = [{ ...source[0], id: 'a0000000-0000-4000-8000-000000000001', name: 'SYNTHETIC CLI ONLY' }];
const bytes = JSON.stringify(input);
const sha256 = createHash('sha256').update(bytes).digest('hex');
function cli(args: string[] = [], includePaths = true) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'apps/api/src/cli/seed-pois.ts',
    ...(includePaths ? ['--database', databasePath, '--input', inputPath] : []), ...args], {
    encoding: 'utf8', timeout: 30000,
    // A misleading inherited URL must never override the explicit target.
    env: { ...process.env, DATABASE_URL: `file:${join(directory, 'must-not-exist.db').replaceAll('\\', '/')}` },
  });
}
beforeAll(async () => {
  await db.$queryRaw`SELECT 1`;
  const migrated = spawnSync(process.execPath, ['scripts/database.mjs'], {
    env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: 'utf8', timeout: 60000,
  });
  if (migrated.status !== 0) throw new Error(`${migrated.error ?? ''}\n${migrated.stdout}\n${migrated.stderr}`);
}, 60000);
beforeEach(async () => {
  await db.pOI.deleteMany();
  writeFileSync(inputPath, bytes);
});
afterAll(async () => {
  await db.$disconnect();
  if (dirname(resolve(directory)) !== resolve(tmpdir())) throw new Error('Unexpected cleanup path');
  rmSync(directory, { recursive: true, force: true });
});

it('defaults to a read-only dry-run and never uses DATABASE_URL', async () => {
  const before = readFileSync(databasePath);
  const run = cli();
  expect(run.status, run.stderr).toBe(0);
  expect(run.stdout).toContain('"dryRun": true');
  expect(run.stdout).toContain('"created": 1');
  expect(run.stdout).toContain('"poiCountBefore": 0');
  expect(run.stdout).toContain('"poiCountAfter": 0');
  expect(run.stdout).toContain(sha256);
  expect(await db.pOI.count()).toBe(0);
  expect(readFileSync(databasePath)).toEqual(before);
  expect(existsSync(join(directory, 'must-not-exist.db'))).toBe(false);
});

it('requires explicit existing target and complete valid input without creating a DB', async () => {
  expect(cli([], false).status).not.toBe(0);
  expect(cli(['--database', 'relative.db', '--input', inputPath], false).status).not.toBe(0);
  const missing = join(directory, 'missing.db');
  expect(cli(['--database', missing, '--input', inputPath], false).status).not.toBe(0);
  expect(existsSync(missing)).toBe(false);
  writeFileSync(inputPath, '[{"id":"partial"}]');
  expect(cli().status).not.toBe(0);
  expect(await db.pOI.count()).toBe(0);
});

it('guards apply by file hash and rejects contradictory/unknown flags', async () => {
  for (const args of [['--apply'], ['--apply', '--approved-sha256', 'wrong'],
    ['--apply', '--dry-run', '--approved-sha256', sha256], ['--unknown']]) {
    expect(cli(args).status).not.toBe(0);
  }
  expect(await db.pOI.count()).toBe(0);
});

it('applies ONLY synthetic data in this temporary DB and replays idempotently', async () => {
  const args = ['--apply', '--approved-sha256', sha256];
  const applied = cli(args);
  expect(applied.status, applied.stderr).toBe(0);
  expect(applied.stdout).toContain('"created": 1');
  expect(await db.pOI.count()).toBe(1);
  const repeated = cli(args);
  expect(repeated.status, repeated.stderr).toBe(0);
  expect(repeated.stdout).toContain('"unchanged": 1');
  expect(cli(['--dry-run']).stdout).toContain('"unchanged": 1');
  expect(await db.pOI.count()).toBe(1);
});

it('prints normalized name and case-insensitive UUID conflicts and refuses writes', async () => {
  const row = { category: 'history', tags: [], lat: 22.19, lng: 113.54, address: 'Test', verification: 'unknown' };
  await db.pOI.create({ data: { ...row, id: 'b0000000-0000-4000-8000-000000000001', name: ' synthetic cli only ' } });
  const byName = cli(['--apply', '--approved-sha256', sha256]);
  expect(byName.status).not.toBe(0);
  expect(byName.stdout).toContain('"conflict": true');
  expect(byName.stderr).toContain('identity conflicts');
  await db.pOI.deleteMany();
  await db.pOI.create({ data: { ...row, id: input[0].id.toUpperCase(), name: 'Other synthetic name' } });
  const byUuid = cli();
  expect(byUuid.status).not.toBe(0);
  expect(byUuid.stdout).toContain('"conflict": true');
  expect(await db.pOI.count()).toBe(1);
});

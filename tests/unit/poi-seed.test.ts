import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { POI } from '@tripmate/contracts';
import { parsePoiSeed, seedPois } from '../../apps/api/src/features/pois/poi.seed.js';
import { createPoiService } from '../../apps/api/src/features/pois/poi.service.js';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { createPoisRouter } from '../../apps/api/src/features/pois/poi.router.js';

const directory = mkdtempSync(join(tmpdir(), 'tripmate-b02-seed-'));
const url = `file:${join(directory, 'seed.db').replaceAll('\\', '/')}`;
const db = new PrismaClient({ datasourceUrl: url });
const id = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const sample = (n = 1): POI => ({ id: id(n), name: `Synthetic Seed Test ${n}`, category: 'history',
  tags: ['SYNTHETIC_TEST_ONLY'], position: { lat: 22.19, lng: 113.54 }, address: 'Synthetic test location, not travel data',
  openingHours: null, suggestedVisitMinutes: null, price: null, verification: 'unknown', sourceUrl: null,
  checkedAt: null, bookingNote: 'Isolated database test only. Never import into demo data.' });
beforeAll(async () => {
  await db.$queryRaw`SELECT 1`;
  const run = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'], {
    env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 30000,
  });
  if (run.status !== 0) throw new Error(`${run.error ?? ''}\n${run.stdout}\n${run.stderr}`);
}, 60000);
beforeEach(async () => {
  await db.favorite.deleteMany(); await db.tripTarget.deleteMany(); await db.trip.deleteMany(); await db.pOI.deleteMany();
});
afterAll(async () => {
  await db.$disconnect();
  if (dirname(resolve(directory)) !== resolve(tmpdir())) throw new Error('Unexpected test cleanup path');
  rmSync(directory, { recursive: true, force: true });
});

describe('B POI seed preparation — isolated SQLite, no real tourism fixture', () => {
  it('joins Seed to the actual Router: search and detail read persisted records after repeated import', async () => {
    const data = [sample(), { ...sample(2), openingHours: [], price: { amountMinor: 0, currency: 'MOP' } }];
    await seedPois(db, data, { dryRun: false });
    await seedPois(db, data, { dryRun: false });
    const app = createApp({ modules: [{ owner: 'B', router: createPoisRouter(db) }] });
    const result = await request(app).get('/api/v1/pois').query({ search: 'test 2', category: 'history' });
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({ items: [data[1]], total: 1 });
    const detail = await request(app).get(`/api/v1/pois/${id(1)}`);
    expect(detail.status).toBe(200); expect(detail.body.data).toEqual(data[0]);
    expect(await db.pOI.count()).toBe(2);
  });
  it('validates the five real review drafts and their source IDs without importing them', async () => {
    const draft: unknown = JSON.parse(readFileSync('data/fixtures/pois.curated-draft.json', 'utf8'));
    const sources = JSON.parse(readFileSync('data/fixtures/pois.sources.json', 'utf8')) as {
      teamApprovedCount: number; importedCount: number; records: Array<{ candidateId: string; seedReady: boolean; position: POI['position'] }>;
    };
    const pois = parsePoiSeed(draft);
    expect(pois).toHaveLength(5);
    expect(sources.teamApprovedCount).toBe(0); expect(sources.importedCount).toBe(0);
    for (const poi of pois) {
      const evidence = sources.records.find(record => record.candidateId === poi.id);
      expect(evidence?.position).toEqual(poi.position); expect(evidence?.seedReady).toBe(false);
      expect(poi.verification).toBe('estimated'); expect(poi.suggestedVisitMinutes).toBeNull();
      expect(poi.tags).not.toContain('SYNTHETIC_TEST_ONLY');
    }
    expect(pois.find(poi => poi.name === '妈阁庙')).toMatchObject({ openingHours: null, price: null });
    expect(await db.pOI.count()).toBe(0);
  });
  it('defaults to a dry run and reports missing rows without writes', async () => {
    expect(await seedPois(db, [sample(), sample(2)])).toEqual({ dryRun: true, total: 2, created: 2, updated: 0, unchanged: 0 });
    expect(await db.pOI.count()).toBe(0);
  });
  it('explicit apply is repeatable; stable UUIDs and unknown/free/closed values round-trip', async () => {
    const a = sample();
    const b: POI = { ...sample(2), openingHours: [], price: { amountMinor: 0, currency: 'MOP' } };
    expect(await seedPois(db, [a, b], { dryRun: false })).toMatchObject({ created: 2, updated: 0, unchanged: 0 });
    expect(await seedPois(db, [a, b], { dryRun: false })).toMatchObject({ created: 0, updated: 0, unchanged: 2 });
    const service = createPoiService(db);
    expect(await service.get(a.id)).toEqual(a); expect(await service.get(b.id)).toEqual(b);
    const rows = await db.$queryRaw<Array<{ id: string; sqlNull: bigint; hoursType: string | null }>>`
      SELECT id, openingHours IS NULL AS sqlNull, json_type(openingHours) AS hoursType FROM POI ORDER BY id`;
    expect(Number(rows[0]!.sqlNull)).toBe(1); expect(rows[0]!.hoursType).toBeNull();
    expect(Number(rows[1]!.sqlNull)).toBe(0); expect(rows[1]!.hoursType).toBe('array');
  });
  it('updates all fields intentionally, preserves relationships and leaves unrelated POIs in place', async () => {
    const a = sample(); await seedPois(db, [a, sample(2)], { dryRun: false });
    const favorite = await db.favorite.create({ data: { poiId: a.id } });
    const trip = await db.trip.create({ data: { title: 'Synthetic seed relation fixture', startDate: '2026-11-05', endDate: '2026-11-05',
      originLabel: 'Synthetic', originLat: 22.19, originLng: 113.54, originSource: 'manual', interests: [] } });
    const target = await db.tripTarget.create({ data: { tripId: trip.id, poiId: a.id, position: 3 } });
    const revised: POI = { ...a, tags: ['SYNTHETIC_TEST_ONLY', 'revised'], name: 'Synthetic renamed seed record', category: 'nature',
      position: { lat: 22.2, lng: 113.55 }, address: 'Revised synthetic address',
      openingHours: [{ weekday: 2, open: '10:00', close: '18:00', lastEntry: null }], suggestedVisitMinutes: 30,
      price: { amountMinor: Number.MAX_SAFE_INTEGER, currency: 'HKD' }, verification: 'estimated',
      sourceUrl: 'https://example.invalid/seed-test', checkedAt: '2026-11-05T00:00:00.000Z', bookingNote: 'Revised test only.' };
    expect(await seedPois(db, [revised])).toMatchObject({ dryRun: true, updated: 1 });
    expect(await createPoiService(db).get(a.id)).toEqual(a);
    expect(await seedPois(db, [revised], { dryRun: false })).toMatchObject({ updated: 1 });
    expect(await createPoiService(db).get(a.id)).toEqual(revised);
    expect((await db.pOI.findUniqueOrThrow({ where: { id: a.id } })).priceAmountMinor).toBe(BigInt(Number.MAX_SAFE_INTEGER));
    expect(await db.favorite.findUnique({ where: { poiId: a.id } })).toEqual(favorite);
    expect(await db.tripTarget.findUnique({ where: { id: target.id } })).toEqual(target);
    expect(await db.pOI.count()).toBe(2);
    await seedPois(db, [a], { dryRun: false });
    expect(await createPoiService(db).get(a.id)).toEqual(a);
    expect(await db.$queryRaw`PRAGMA foreign_key_check`).toEqual([]);
  });
  it('rejects identity conflicts before inserting any other rows', async () => {
    await seedPois(db, [sample()], { dryRun: false });
    const collision = { ...sample(9), name: `  ${sample().name.toUpperCase()}  ` };
    await expect(seedPois(db, [sample(2), collision], { dryRun: false })).rejects.toThrow('canonical IDs');
    expect(await db.pOI.count()).toBe(1); expect(await db.pOI.findUnique({ where: { id: id(2) } })).toBeNull();
  });
  it('validates the whole batch before database access', async () => {
    const transaction = vi.spyOn(db, '$transaction');
    try {
      await expect(seedPois(db, [sample(), { ...sample(2), price: { amountMinor: -1, currency: 'MOP' } }], { dryRun: false })).rejects.toThrow('input index 1');
      expect(transaction).not.toHaveBeenCalled();
    } finally { transaction.mockRestore(); }
  });
  it.each([
    [sample(), sample()], [sample(), { ...sample(2), name: sample().name }],
    [{ ...sample(), openingHours: undefined }], [{ ...sample(), unexpected: true }],
    [{ ...sample(), position: null }], [{ ...sample(), position: { lat: Infinity, lng: 113.54 } }],
    [{ ...sample(), price: { amountMinor: 9007199254740992, currency: 'MOP' } }],
    [{ ...sample(), price: { amountMinor: 0, currency: 'USD' } }],
    [{ ...sample(), openingHours: [{ weekday: 1, open: '10:00', close: '18:00', lastEntry: '09:00' }] }],
    [{ ...sample(), openingHours: [{ weekday: 1, open: '10:00', close: '14:00', lastEntry: null }, { weekday: 1, open: '13:00', close: '18:00', lastEntry: null }] }],
    [{ ...sample(), checkedAt: '2026-02-30T00:00:00Z' }], [{ ...sample(), checkedAt: '2026-11-05T08:00:00+08:00' }],
  ].map(input => [input]))('rejects malformed/incomplete or duplicate POIs', input => {
    expect(() => parsePoiSeed(input)).toThrow('input index');
  });
  it('rejects a source metadata object and accepts an empty no-op batch', async () => {
    expect(() => parsePoiSeed({ records: [], teamApprovedCount: 0 })).toThrow('POI array');
    expect(await seedPois(db, [], { dryRun: false })).toEqual({ dryRun: false, total: 0, created: 0, updated: 0, unchanged: 0 });
  });
  it('rolls back earlier successful writes if a later database operation fails', async () => {
    await db.$executeRawUnsafe(`CREATE TRIGGER fail_seed_fixture BEFORE INSERT ON POI WHEN NEW.id = '${id(2)}' BEGIN SELECT RAISE(ABORT, 'controlled seed failure'); END`);
    try {
      await expect(seedPois(db, [sample(), sample(2)], { dryRun: false })).rejects.toThrow();
      expect(await db.pOI.count()).toBe(0);
    } finally { await db.$executeRawUnsafe('DROP TRIGGER fail_seed_fixture'); }
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Prisma, PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createApp } from '../../apps/api/src/app.js';
import { createPoisRouter } from '../../apps/api/src/features/pois/poi.router.js';
import { createPoiService } from '../../apps/api/src/features/pois/poi.service.js';
import { toPOI } from '../../apps/api/src/features/pois/poi.dto.js';

const directory = mkdtempSync(join(tmpdir(), 'tripmate-b02-'));
const db = new PrismaClient({ datasourceUrl: `file:${join(directory, 'pois.db').replaceAll('\\', '/')}` });
const app = createApp({ modules: [{ owner: 'B', router: createPoisRouter(db) }] });
const id = (n: number) => `10000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
const base = { category: 'history', tags: ['SYNTHETIC_TEST_ONLY'], lat: 22.19, lng: 113.54,
  address: 'Synthetic Harbour Road — not a real attraction', verification: 'unknown', openingHours: Prisma.DbNull };

beforeAll(async () => {
  // Match A-03's isolated SQLite setup: initialize the empty database file first.
  await db.$queryRaw`SELECT 1`;
  const run = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'], {
    env: { ...process.env, DATABASE_URL: `file:${join(directory, 'pois.db').replaceAll('\\', '/')}` },
    encoding: 'utf8', timeout: 30000,
  });
  if (run.status !== 0) throw new Error(`${run.error ?? ''}\n${run.stdout}\n${run.stderr}`);
}, 60000);
beforeEach(async () => {
  await db.favorite.deleteMany();
  await db.pOI.deleteMany();
  await db.pOI.createMany({ data: [
    { ...base, id: id(1), name: 'Synthetic Alpha', tags: ['SYNTHETIC_TEST_ONLY', 'Museum', '[literal]'],
      checkedAt: new Date('2026-11-04T00:00:00.000Z'), sourceUrl: 'https://example.invalid/test-only', bookingNote: 'Test only.' },
    { ...base, id: id(2), name: 'Synthetic Beta', openingHours: [], priceAmountMinor: 0n, priceCurrency: 'MOP' },
    { ...base, id: id(3), name: 'Synthetic Gamma', category: 'food', address: 'Synthetic Dining Lane',
      priceAmountMinor: BigInt(Number.MAX_SAFE_INTEGER), priceCurrency: 'HKD',
      openingHours: [{ weekday: 1, open: '10:00', close: '12:00', lastEntry: '11:30' },
        { weekday: 1, open: '14:00', close: '18:00', lastEntry: null }], suggestedVisitMinutes: 45 },
    { ...base, id: id(4), name: 'Synthetic Shop', category: 'shopping' },
    { ...base, id: id(6), name: 'Synthetic Duplicate', category: 'nature' },
    { ...base, id: id(5), name: 'Synthetic Duplicate', category: 'nature' },
  ] });
  await db.favorite.create({ data: { poiId: id(1) } });
});
afterAll(async () => {
  await db.$disconnect();
  if (dirname(resolve(directory)) !== resolve(tmpdir())) throw new Error('Unexpected test cleanup path');
  rmSync(directory, { recursive: true, force: true });
});

describe('B-02/B-03 POI Router against migrated SQLite (synthetic data only)', () => {
  it('returns the shared list envelope, stable name/id order and every public DTO field', async () => {
    const result = await request(app).get('/api/v1/pois');
    expect(result.status).toBe(200);
    expect(result.body.data.total).toBe(6);
    const items = result.body.data.items;
    expect(items.map((p: { id: string }) => p.id)).toEqual([id(1), id(2), id(5), id(6), id(3), id(4)]);
    expect(Object.keys(items[0]).sort()).toEqual(['id', 'name', 'category', 'tags', 'position', 'address',
      'openingHours', 'suggestedVisitMinutes', 'price', 'verification', 'sourceUrl', 'checkedAt', 'bookingNote'].sort());
    expect(items[0].position).toEqual({ lat: 22.19, lng: 113.54 });
    expect(items[0].checkedAt).toBe('2026-11-04T00:00:00.000Z');
  });
  it.each(['  ALPHA  ', 'museum', '[literal]'])('searches names/tags literally and case-insensitively: %s', async search => {
    const result = await request(app).get('/api/v1/pois').query({ search });
    expect(result.status).toBe(200);
    expect(result.body.data.items.map((p: { id: string }) => p.id)).toEqual([id(1)]);
  });
  it('searches addresses, combines all filters by AND, and never treats input as regex', async () => {
    expect((await request(app).get('/api/v1/pois').query({ search: 'DINING lane' })).body.data.total).toBe(1);
    expect((await request(app).get('/api/v1/pois').query({ search: 'synthetic', category: 'history', favoriteOnly: 'true' })).body.data.items.map((p: { id: string }) => p.id)).toEqual([id(1)]);
    expect((await request(app).get('/api/v1/pois').query({ category: 'food', favoriteOnly: 'true' })).body).toEqual({ data: { items: [], total: 0 } });
    expect((await request(app).get('/api/v1/pois').query({ search: '.*' })).body).toEqual({ data: { items: [], total: 0 } });
    expect((await request(app).get('/api/v1/pois').query({ search: '   ', favoriteOnly: 'false' })).body.data.total).toBe(6);
    expect(await db.tripTarget.count()).toBe(0);
    expect(await db.favorite.count()).toBe(1);
  });
  it.each(['category=invalid', 'category=', 'favoriteOnly=1', 'favoriteOnly=True', 'favoriteOnly=',
    'search=a&search=b', 'category=food&category=nature', 'search%5Bx%5D=a', 'page=1', 'limit=10'])('rejects unsupported or malformed query: %s', async query => {
    const result = await request(app).get(`/api/v1/pois?${query}`);
    expect(result.status).toBe(400);
    expect(result.body.error).toMatchObject({ code: 'BAD_REQUEST', details: null });
  });
  it('returns a real empty list when the database has no POIs', async () => {
    await db.favorite.deleteMany(); await db.pOI.deleteMany();
    expect((await request(app).get('/api/v1/pois')).body).toEqual({ data: { items: [], total: 0 } });
  });
  it('keeps unknown, closed, free, safe integer prices and last-entry null distinct', async () => {
    const unknown = await request(app).get(`/api/v1/pois/${id(1)}`);
    expect(unknown.status).toBe(200);
    expect(unknown.body.data).toMatchObject({ openingHours: null, price: null, suggestedVisitMinutes: null });
    const closed = await request(app).get(`/api/v1/pois/${id(2)}`);
    expect(closed.body.data).toMatchObject({ openingHours: [], price: { amountMinor: 0, currency: 'MOP' } });
    const known = await request(app).get(`/api/v1/pois/${id(3)}`);
    expect(known.body.data.price).toEqual({ amountMinor: Number.MAX_SAFE_INTEGER, currency: 'HKD' });
    expect(known.body.data.openingHours).toEqual([
      { weekday: 1, open: '10:00', close: '12:00', lastEntry: '11:30' },
      { weekday: 1, open: '14:00', close: '18:00', lastEntry: null },
    ]);
  });
  it('distinguishes malformed UUID, missing record and unsupported detail query', async () => {
    expect((await request(app).get('/api/v1/pois/not-a-uuid')).status).toBe(400);
    const malformed = await request(app).get('/api/v1/pois/%E0%A4%A');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toMatchObject({ code: 'BAD_REQUEST', details: null });
    expect((await request(app).get(`/api/v1/pois/${id(99)}`)).body).toEqual({ error: { code: 'NOT_FOUND', message: 'POI not found.', details: null } });
    expect((await request(app).get(`/api/v1/pois/${id(1)}?search=test`)).status).toBe(400);
  });
  it('supports direct read-only use inside the caller transaction', async () => {
    await db.$transaction(async tx => {
      const service = createPoiService(tx);
      expect((await service.list({ category: 'nature' })).total).toBe(2);
      expect((await service.get(id(1)))?.id).toBe(id(1));
      expect(await service.get(id(99))).toBeNull();
    });
  });
  it('rejects corrupt JSON instead of fabricating fields or dropping a record', async () => {
    await db.pOI.update({ where: { id: id(1) }, data: { tags: [42] } });
    for (const path of ['/api/v1/pois', `/api/v1/pois/${id(1)}`]) {
      const result = await request(app).get(path);
      expect(result.status).toBe(409);
      expect(result.body.error.code).toBe('DATA_INTEGRITY_ERROR');
      expect(result.body.error.details).toBeNull();
    }
  });
  it('validates individual opening windows and safe price mapping, not just JSON containers', async () => {
    const row = await db.pOI.findUniqueOrThrow({ where: { id: id(3) } });
    for (const hours of [[{ weekday: 8, open: '10:00', close: '18:00', lastEntry: null }],
      [{ weekday: 1, open: '18:00', close: '10:00', lastEntry: null }],
      [{ weekday: 1, open: '10:00', close: '18:00', lastEntry: '09:00' }],
      [{ weekday: 1, open: '10:00', close: '14:00', lastEntry: null }, { weekday: 1, open: '13:00', close: '18:00', lastEntry: null }]]) {
      expect(() => toPOI({ ...row, openingHours: hours })).toThrow('Stored POI');
    }
    expect(() => toPOI({ ...row, priceAmountMinor: BigInt(Number.MAX_SAFE_INTEGER) + 1n })).toThrow('Stored POI');
  });
  it('reports unavailable storage without database paths or SQL in the response', async () => {
    const missing = new PrismaClient({ datasourceUrl: `file:${join(directory, 'no-parent', 'missing.db').replaceAll('\\', '/')}` });
    try {
      const unavailable = createApp({ modules: [{ owner: 'B', router: createPoisRouter(missing) }] });
      const result = await request(unavailable).get('/api/v1/pois');
      expect(result.status).toBe(503);
      expect(result.body).toEqual({ error: { code: 'STORAGE_UNAVAILABLE', message: 'Database is unavailable.', details: null } });
    } finally { await missing.$disconnect(); }
  });
});

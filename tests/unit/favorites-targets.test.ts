import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import request from 'supertest';
import type { PlannerInput, PlanResult } from '@tripmate/contracts';
import { createApp } from '../../apps/api/src/app.js';
import { createFavoritesRouter } from '../../apps/api/src/features/favorites/router.js';
import { createTargetsRouter } from '../../apps/api/src/features/targets/router.js';
import { readTargets } from '../../apps/api/src/features/targets/service.js';
import { createPoisRouter } from '../../apps/api/src/features/pois/poi.router.js';
import { createPoiService } from '../../apps/api/src/features/pois/poi.service.js';

const directory = mkdtempSync(join(tmpdir(), 'tripmate-b04-'));
const url = `file:${join(directory, 'relations.db').replaceAll('\\', '/')}`;
const db = new PrismaClient({ datasourceUrl: url });
// Test-only composition of the actual factories; A owns production registration.
const combinedApp = (client: PrismaClient) => createApp({ modules: [
  { owner: 'B', router: createPoisRouter(client) },
  { owner: 'B', router: createFavoritesRouter(client) },
  { owner: 'B', router: createTargetsRouter(client) },
] });
const app = combinedApp(db);
const id = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const trip = id(1), otherTrip = id(2), a = id(11), b = id(12), c = id(13), missing = id(99);
const fav = (poiId: string) => `/api/v1/favorites/${poiId}`;
const targets = (tripId = trip) => `/api/v1/trips/${tripId}/targets`;
const config = (tripId: string) => ({ id: tripId, title: 'Synthetic B04 fixture', startDate: '2026-11-05', endDate: '2026-11-05',
  originLabel: 'Test-only position', originLat: 22.19, originLng: 113.54, originSource: 'manual', interests: [] });
beforeAll(async () => {
  await db.$queryRaw`SELECT 1`;
  const run = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'], {
    env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 30000,
  });
  if (run.status !== 0) throw new Error(`${run.error ?? ''}\n${run.stdout}\n${run.stderr}`);
}, 60000);
beforeEach(async () => {
  await db.favorite.deleteMany(); await db.tripTarget.deleteMany(); await db.trip.deleteMany(); await db.pOI.deleteMany();
  await db.trip.createMany({ data: [config(trip), config(otherTrip)] });
  await db.pOI.createMany({ data: [a, b, c].map((poiId, index) => ({ id: poiId, name: `Synthetic B04 POI ${index}`,
    category: 'history', tags: ['SYNTHETIC_TEST_ONLY'], lat: 22.19, lng: 113.54, address: 'Not real travel data', verification: 'unknown' })) });
});
afterAll(async () => {
  await db.$disconnect();
  if (dirname(resolve(directory)) !== resolve(tmpdir())) throw new Error('Unexpected test cleanup path');
  rmSync(directory, { recursive: true, force: true });
});

describe('B-04 Favorites and Targets against migrated SQLite', () => {
  it('reflects Favorite writes in POI AND filters without coupling Trip targets or changing POI details', async () => {
    await db.pOI.update({ where: { id: c }, data: { category: 'shopping' } });
    const detail = await request(app).get(`/api/v1/pois/${a}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: a, openingHours: null, price: null, suggestedVisitMinutes: null });
    expect((await request(app).get('/api/v1/pois').query({ favoriteOnly: true })).body).toEqual({ data: { items: [], total: 0 } });
    for (const poiId of [a, c]) expect((await request(app).put(fav(poiId)).send({})).status).toBe(200);
    expect((await request(app).post(targets()).send({ poiId: b })).status).toBe(201);
    const filtered = await request(app).get('/api/v1/pois').query({ favoriteOnly: true, category: 'history', search: ' POI 0 ' });
    expect(filtered.status).toBe(200);
    expect(filtered.body).toEqual({ data: { items: [detail.body.data], total: 1 } });
    expect((await request(app).get('/api/v1/pois').query({ favoriteOnly: true, category: 'shopping', search: 'POI 0' })).body)
      .toEqual({ data: { items: [], total: 0 } });
    expect((await request(app).get('/api/v1/pois').query({ favoriteOnly: true, category: 'shopping' })).body.data.items.map((poi: { id: string }) => poi.id)).toEqual([c]);
    expect((await request(app).delete(fav(a))).status).toBe(200);
    expect((await request(app).get('/api/v1/pois').query({ favoriteOnly: true })).body.data.items.map((poi: { id: string }) => poi.id)).toEqual([c]);
    expect((await request(app).get(targets())).body.data.poiIds).toEqual([b]);
    expect((await request(app).get(`/api/v1/pois/${a}`)).body).toEqual(detail.body);
    expect((await request(app).get('/api/v1/pois').query({ favoriteOnly: false })).body.data.total).toBe(3);
  });
  it('reconstructs Favorite and per-Trip target state through a fresh client using the same isolated database', async () => {
    expect((await request(app).put(fav(a)).send({})).status).toBe(200);
    for (const poiId of [b, a]) expect((await request(app).post(targets()).send({ poiId })).status).toBe(201);
    expect((await request(app).post(targets(otherTrip)).send({ poiId: c })).status).toBe(201);
    const reopened = new PrismaClient({ datasourceUrl: url });
    try {
      const restored = combinedApp(reopened);
      expect((await request(restored).get(fav(a))).body).toEqual({ data: { poiId: a, favorited: true } });
      expect((await request(restored).get('/api/v1/pois').query({ favoriteOnly: true })).body.data.items.map((poi: { id: string }) => poi.id)).toEqual([a]);
      expect((await request(restored).get(targets())).body).toEqual({ data: { tripId: trip, poiIds: [b, a] } });
      expect((await request(restored).get(targets(otherTrip))).body).toEqual({ data: { tripId: otherTrip, poiIds: [c] } });
      const duplicate = await request(restored).post(targets()).send({ poiId: a });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error).toMatchObject({ code: 'DUPLICATE_TARGET', details: { tripId: trip, poiId: a } });
      expect((await request(restored).delete(`${targets()}/${b}`)).body.data.poiIds).toEqual([a]);
      expect((await request(app).get(targets())).body.data.poiIds).toEqual([a]);
      expect((await request(app).get(targets(otherTrip))).body.data.poiIds).toEqual([c]);
      expect((await request(app).get(fav(a))).body.data.favorited).toBe(true);
    } finally { await reopened.$disconnect(); }
  });
  it('resolves POIs in target order within a caller-owned read transaction, independently of Favorites', async () => {
    for (const poiId of [c, a]) expect((await request(app).post(targets()).send({ poiId })).status).toBe(201);
    expect((await request(app).put(fav(b)).send({})).status).toBe(200);
    const selected = await db.$transaction(async tx => {
      const view = await readTargets(tx, trip);
      const pois = createPoiService(tx);
      return { view, resolved: await Promise.all(view.poiIds.map(poiId => pois.get(poiId))) };
    });
    expect(selected.view).toEqual({ tripId: trip, poiIds: [c, a] });
    expect(selected.resolved.map(poi => poi?.id)).toEqual([c, a]);
    expect(selected.resolved.every(poi => poi?.verification === 'unknown' && poi.price === null && poi.openingHours === null)).toBe(true);
    expect(await db.favorite.count()).toBe(1);
  });
  it('persists Favorite state with idempotent PUT/DELETE and exact shared response fields', async () => {
    expect((await request(app).get(fav(a))).body).toEqual({ data: { poiId: a, favorited: false } });
    for (let n = 0; n < 2; n++) {
      const response = await request(app).put(fav(a)).send({});
      expect(response.status).toBe(200); expect(response.body).toEqual({ data: { poiId: a, favorited: true } });
    }
    expect(await db.favorite.count()).toBe(1); expect(await db.tripTarget.count()).toBe(0);
    expect((await request(app).get(fav(a))).body.data.favorited).toBe(true);
    for (let n = 0; n < 2; n++) {
      const response = await request(app).delete(fav(a));
      expect(response.status).toBe(200); expect(response.body).toEqual({ data: { poiId: a, favorited: false } });
    }
    expect(await db.favorite.count()).toBe(0);
  });
  it.each(['get', 'put', 'delete'] as const)('returns 404 for a missing Favorite POI: %s', async method => {
    const call = request(app)[method](fav(missing));
    const response = method === 'put' ? await call.send({}) : await call;
    expect(response.status).toBe(404); expect(response.body.error).toMatchObject({ code: 'NOT_FOUND', details: null });
  });
  it('maintains target Add order, reports duplicate details and appends re-added targets', async () => {
    expect((await request(app).get(targets())).body).toEqual({ data: { tripId: trip, poiIds: [] } });
    expect((await request(app).post(targets()).send({ poiId: a })).status).toBe(201);
    expect((await request(app).post(targets()).send({ poiId: b })).body).toEqual({ data: { tripId: trip, poiIds: [a, b] } });
    const duplicate = await request(app).post(targets()).send({ poiId: a });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toMatchObject({ code: 'DUPLICATE_TARGET', details: { tripId: trip, poiId: a } });
    expect(await db.tripTarget.count()).toBe(2);
    expect((await request(app).delete(`${targets()}/${a}`)).body.data.poiIds).toEqual([b]);
    expect((await request(app).post(targets()).send({ poiId: a })).body.data.poiIds).toEqual([b, a]);
    expect((await db.tripTarget.findMany({ where: { tripId: trip }, orderBy: { position: 'asc' } })).map(row => row.position)).toEqual([1, 2]);
    await request(app).delete(`${targets()}/${a}`); await request(app).delete(`${targets()}/${b}`);
    await request(app).post(targets()).send({ poiId: c });
    expect((await db.tripTarget.findFirstOrThrow({ where: { tripId: trip } })).position).toBe(0);
    expect(await db.favorite.count()).toBe(0);
  });
  it('keeps Favorite, each Trip target list and existing saved snapshots independent', async () => {
    const input: PlannerInput = { trip: { id: trip, title: 'Synthetic snapshot', startDate: '2026-11-05', endDate: '2026-11-05',
      origin: { label: 'Synthetic', position: { lat: 22.19, lng: 113.54 }, source: 'manual' },
      dayWindows: [{ date: '2026-11-05', start: '09:00', end: '18:00' }], interests: [], budget: null, pace: 'standard' },
      selectedPois: [], defaultTravelMode: 'walk', fxRates: [] };
    const result: PlanResult = { tripId: trip, status: 'needs_review', days: [{ date: '2026-11-05', stops: [], legs: [] }],
      unscheduled: [], warnings: [], estimatedTotalCost: null };
    const saved = await db.savedItinerary.create({ data: { tripId: trip,
      input: JSON.parse(JSON.stringify(input)), result: JSON.parse(JSON.stringify(result)), timeOverrides: [] } });
    await request(app).post(targets()).send({ poiId: a });
    await request(app).post(targets(otherTrip)).send({ poiId: a });
    expect(await db.favorite.count()).toBe(0);
    await request(app).put(fav(a)).send({});
    await request(app).delete(`${targets()}/${a}`);
    expect((await request(app).get(fav(a))).body.data.favorited).toBe(true);
    expect((await request(app).get(targets(otherTrip))).body.data.poiIds).toEqual([a]);
    await request(app).delete(fav(a));
    expect((await request(app).get(targets(otherTrip))).body.data.poiIds).toEqual([a]);
    expect(await db.savedItinerary.findUnique({ where: { id: saved.id } })).toEqual(saved);
    await request(app).put(fav(a)).send({}); await db.trip.delete({ where: { id: otherTrip } });
    expect((await request(app).get(fav(a))).body.data.favorited).toBe(true);
  });
  it('idempotently removes absent relationships even when POI does not exist; only missing Trip is 404', async () => {
    for (let n = 0; n < 2; n++) {
      const response = await request(app).delete(`${targets()}/${missing}`);
      expect(response.status).toBe(200); expect(response.body).toEqual({ data: { tripId: trip, poiIds: [] } });
    }
    expect((await request(app).post(targets()).send({ poiId: missing })).status).toBe(404);
    expect((await request(app).get(targets(missing))).status).toBe(404);
    expect((await request(app).post(targets(missing)).send({ poiId: a })).status).toBe(404);
    expect((await request(app).delete(`${targets(missing)}/${a}`)).status).toBe(404);
  });
  it('returns complete ordered target IDs in a caller-owned read transaction', async () => {
    await request(app).post(targets()).send({ poiId: b }); await request(app).post(targets()).send({ poiId: a });
    expect(await db.$transaction(tx => readTargets(tx, trip))).toEqual({ tripId: trip, poiIds: [b, a] });
  });
  it('cleans a legacy dangling target without a POI lookup or silent omission', async () => {
    await request(app).post(targets()).send({ poiId: a });
    // Corrupt only this disposable database to reproduce a legacy bad import.
    await db.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    try { await db.$executeRaw`DELETE FROM POI WHERE id = ${a}`; }
    finally { await db.$executeRawUnsafe('PRAGMA foreign_keys = ON'); }
    expect(await db.pOI.findUnique({ where: { id: a } })).toBeNull();
    expect((await request(app).get(targets())).body.data.poiIds).toEqual([a]);
    const response = await request(app).delete(`${targets()}/${a}`);
    expect(response.status).toBe(200); expect(response.body.data.poiIds).toEqual([]);
    expect(await db.$queryRaw`PRAGMA foreign_key_check`).toEqual([]);
  });
  it.each([
    ['put', '/api/v1/favorites/not-a-uuid', {}, 400],
    ['get', '/api/v1/favorites/%E0%A4%A', undefined, 400],
    ['get', `/api/v1/favorites/${a}?tripId=${trip}`, undefined, 400],
    ['put', fav(a), { tripId: trip }, 422], ['put', fav(a), [], 422], ['put', fav(a), undefined, 422],
    ['get', fav(a), {}, 422], ['delete', fav(a), {}, 422],
    ['get', '/api/v1/trips/invalid/targets', undefined, 400],
    ['get', `${targets()}?limit=10`, undefined, 400],
    ['post', targets(), {}, 422], ['post', targets(), { poiId: a, favorite: true }, 422],
    ['post', targets(), { poiId: [a] }, 400], ['post', targets(), { poiId: 'invalid' }, 400],
    ['delete', `${targets()}/not-uuid`, undefined, 400], ['delete', `${targets()}/${a}`, {}, 422],
  ] as const)('validates HTTP boundary: %s %s', async (method, path, body, status) => {
    const call = request(app)[method](path);
    const response = body === undefined ? await call : await call.send(body);
    expect(response.status).toBe(status); expect(response.body.error.details).toBeDefined();
    expect(await db.favorite.count()).toBe(0); expect(await db.tripTarget.count()).toBe(0);
  });
  it('uses shared 400 malformed JSON handling without writes', async () => {
    const response = await request(app).put(fav(a)).set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400); expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(await db.favorite.count()).toBe(0);
  });
  it('handles concurrent duplicate/different Adds and idempotent Favorite PUTs', async () => {
    const duplicate = await Promise.all([request(app).post(targets()).send({ poiId: a }), request(app).post(targets()).send({ poiId: a })]);
    expect(duplicate.map(response => response.status).sort()).toEqual([201, 409]);
    expect(await db.tripTarget.count()).toBe(1);
    await db.tripTarget.deleteMany();
    const added = await Promise.all([request(app).post(targets()).send({ poiId: a }), request(app).post(targets()).send({ poiId: b })]);
    expect(added.map(response => response.status)).toEqual([201, 201]);
    expect((await db.tripTarget.findMany({ orderBy: { position: 'asc' } })).map(row => row.position)).toEqual([0, 1]);
    const favorites = await Promise.all([request(app).put(fav(a)).send({}), request(app).put(fav(a)).send({})]);
    expect(favorites.map(response => response.status)).toEqual([200, 200]); expect(await db.favorite.count()).toBe(1);
  }, 20000);
  it('retries a position conflict instead of falsely reporting a duplicate target', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Controlled unique position conflict', { code: 'P2002', clientVersion: 'test', meta: { target: ['tripId', 'position'] } });
    const spy = vi.spyOn(db, '$transaction').mockRejectedValueOnce(error);
    try {
      const response = await request(app).post(targets()).send({ poiId: a });
      expect(response.status).toBe(201); expect(response.body.data.poiIds).toEqual([a]); expect(spy).toHaveBeenCalledTimes(2);
    } finally { spy.mockRestore(); }
  });
  it('limits retry and returns sanitized storage-busy errors without partial writes', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Private storage detail', { code: 'P2034', clientVersion: 'test' });
    const spy = vi.spyOn(db, '$transaction').mockRejectedValueOnce(error).mockRejectedValueOnce(error).mockRejectedValueOnce(error);
    try {
      const response = await request(app).post(targets()).send({ poiId: a });
      expect(response.status).toBe(503); expect(response.body.error).toMatchObject({ code: 'STORAGE_UNAVAILABLE', details: null });
      expect(JSON.stringify(response.body)).not.toContain('Private'); expect(spy).toHaveBeenCalledTimes(3);
    } finally { spy.mockRestore(); }
    expect(await db.tripTarget.count()).toBe(0);
  });
  it('sanitizes unavailable database errors', async () => {
    const unavailable = new PrismaClient({ datasourceUrl: `file:${join(directory, 'no-parent', 'missing.db').replaceAll('\\', '/')}` });
    try {
      const failing = createApp({ modules: [{ owner: 'B', router: createFavoritesRouter(unavailable) }] });
      const response = await request(failing).get(fav(a));
      expect(response.status).toBe(503); expect(response.body.error).toMatchObject({ code: 'STORAGE_UNAVAILABLE', details: null });
      expect(JSON.stringify(response.body)).not.toContain(directory);
    } finally { await unavailable.$disconnect(); }
  });
});

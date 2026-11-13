import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Express } from 'express';

const directory = mkdtempSync(join(tmpdir(), 'tripmate-a-app-'));
const url = `file:${join(directory, 'app.db').replaceAll('\\', '/')}`;
const previousUrl = process.env.DATABASE_URL;
let db: PrismaClient;
let app: Express;
let createApp: typeof import('../../apps/api/src/app.js').createApp;
const a = 'a0000000-0000-4000-8000-000000000011';
const b = 'a0000000-0000-4000-8000-000000000012';
let trip: { id: string };
let other: { id: string };
const targets = (id = trip.id) => `/api/v1/trips/${id}/targets`;
const favorite = `/api/v1/favorites/${a}`;

beforeAll(async () => {
  // Set before importing the production app/db; never use a demo database.
  process.env.DATABASE_URL = url;
  ({ prisma: db } = await import('../../apps/api/src/db.js'));
  await db.$queryRaw`SELECT 1`;
  const run = spawnSync(process.execPath, ['scripts/database.mjs'], {
    env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 60000,
  });
  if (run.status !== 0) throw new Error(`${run.error ?? ''}\n${run.stdout}\n${run.stderr}`);
  ({ createApp } = await import('../../apps/api/src/app.js'));
  app = createApp(); // No injected modules: the actual production defaults.
  expect((await request(app).get('/api/v1/pois')).body.data.total).toBe(0);
  expect(await db.pOI.count()).toBe(0); // App construction does not seed.
  await db.pOI.createMany({ data: [a, b].map((id, index) => ({ id, name: `SYNTHETIC APP ${index}`,
    category: 'history', tags: ['SYNTHETIC_TEST_ONLY'], lat: 22.19, lng: 113.54,
    address: 'Test only', verification: 'unknown' })) });
  const origin = (await request(app).get('/api/v1/origins')).body.data.items[0];
  const createTrip = async () => {
    const response = await request(app).post('/api/v1/trips').send({ title: 'Synthetic App Trip',
      startDate: '2028-02-29', endDate: '2028-02-29',
      origin: { label: origin.label, position: origin.position, source: 'curated' },
      dayWindows: [{ date: '2028-02-29', start: '09:00', end: '18:00' }], interests: [], budget: null });
    expect(response.status).toBe(201); return response.body.data;
  };
  trip = await createTrip(); other = await createTrip();
}, 60000);
afterAll(async () => {
  await db?.$disconnect();
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  if (dirname(resolve(directory)) !== resolve(tmpdir())) throw new Error('Unexpected cleanup path');
  rmSync(directory, { recursive: true, force: true });
});

it('persists Favorites and ordered per-Trip Targets through default app and reconnect', async () => {
  const before = (await request(app).get(`/api/v1/trips/${trip.id}`)).body;
  for (let repeat = 0; repeat < 2; repeat++) {
    expect((await request(app).put(favorite).send({})).body).toEqual({ data: { poiId: a, favorited: true } });
  }
  for (const poiId of [b, a]) expect((await request(app).post(targets()).send({ poiId })).status).toBe(201);
  expect((await request(app).post(targets(other.id)).send({ poiId: a })).status).toBe(201);
  const duplicate = await request(app).post(targets()).send({ poiId: a });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body.error).toMatchObject({ code: 'DUPLICATE_TARGET', details: { tripId: trip.id, poiId: a } });
  const fresh = new PrismaClient({ datasourceUrl: url });
  try {
    expect(await fresh.favorite.count()).toBe(1);
    expect((await fresh.tripTarget.findMany({ where: { tripId: trip.id }, orderBy: { position: 'asc' } })).map(row => row.poiId)).toEqual([b, a]);
  } finally { await fresh.$disconnect(); }
  await db.$disconnect();
  app = createApp();
  expect((await request(app).get(favorite)).body.data.favorited).toBe(true);
  expect((await request(app).get(targets())).body.data).toEqual({ tripId: trip.id, poiIds: [b, a] });
  expect((await request(app).get('/api/v1/pois?favoriteOnly=true')).body.data.items.map((poi: { id: string }) => poi.id)).toEqual([a]);
  for (let repeat = 0; repeat < 2; repeat++) {
    expect((await request(app).delete(`${targets()}/${a}`)).body.data.poiIds).toEqual([b]);
  }
  expect((await request(app).get(targets(other.id))).body.data.poiIds).toEqual([a]);
  expect((await request(app).get(favorite)).body.data.favorited).toBe(true);
  for (let repeat = 0; repeat < 2; repeat++) {
    expect((await request(app).delete(favorite)).body.data.favorited).toBe(false);
  }
  expect((await request(app).get(targets(other.id))).body.data.poiIds).toEqual([a]);
  expect((await request(app).get(`/api/v1/trips/${trip.id}`)).body).toEqual(before);
  expect(await db.pOI.count()).toBe(2);
});

it('keeps prefix and validation boundaries on the registered relation routes', async () => {
  expect((await request(app).put(favorite).send({ extra: true })).status).toBe(422);
  expect((await request(app).get('/api/v1/favorites/invalid')).status).toBe(400);
  expect((await request(app).get('/api/v1/trips/a0000000-0000-4000-8000-000000000099/targets')).status).toBe(404);
  for (const path of [`/favorites/${a}`, `/api/v1/api/v1/favorites/${a}`]) {
    expect((await request(app).get(path)).status).toBe(404);
  }
});

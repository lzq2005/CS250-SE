import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import type { PlannerInput } from '@tripmate/contracts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createTripsRouter } from '../../apps/api/src/features/trips/router.js';
import { createCompanionService, validateCompanionName } from '../../apps/api/src/features/trips/companions.js';
import { createTripService, readTrip } from '../../apps/api/src/features/trips/service.js';
import { originOptions } from '../../apps/api/src/features/trips/origins.js';

const dir = mkdtempSync(join(tmpdir(), 'tripmate-a05-'));
const url = `file:${join(dir, 'trip.db').replaceAll('\\', '/')}`;
const db = new PrismaClient({ datasourceUrl: url });
const app = express();
app.use(express.json());
app.use('/api/v1', createTripsRouter(db));
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.', details: null } }));
const trips = createTripService(db);
const companions = createCompanionService(db);
const newTrip = () => trips.create({ title: 'A05 test', startDate: '2028-02-29', endDate: '2028-02-29',
  origin: { label: originOptions[0]!.label, position: originOptions[0]!.position, source: 'curated' },
  dayWindows: [{ date: '2028-02-29', start: '09:00', end: '18:00' }], interests: [], budget: null });
beforeAll(async () => {
  await db.$queryRaw`SELECT 1`;
  const run = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', resolve('apps/api/prisma/schema.prisma')], {
    env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8',
  });
  if (run.status !== 0) throw new Error(run.stdout + run.stderr);
});
afterAll(async () => { await db.$disconnect(); rmSync(dir, { recursive: true, force: true }); });

describe('A-05 name validation', () => {
  it('trims names and preserves Unicode and internal spaces', () => {
    expect(validateCompanionName({ name: '  李 明 👋  ' })).toBe('李 明 👋');
  });
  it.each([undefined, null, [], 'Alice', {}, { name: null }, { name: 12 }, { name: [] }, { name: '' }, { name: ' \t\n' },
    { name: 'Alice', tripId: crypto.randomUUID() }, { name: 'Alice', id: crypto.randomUUID() }, { name: 'Alice', createdAt: 'now' },
  ])('rejects malformed or overposted input %j', body => {
    expect(() => validateCompanionName(body)).toThrow(expect.objectContaining({ status: 422, code: 'VALIDATION_ERROR' }));
  });
});

describe('A-05 HTTP API with migrated SQLite', () => {
  it('returns an empty list for an existing Trip; persists add/rename with exact shared shapes and stable IDs', async () => {
    const trip = await newTrip(); const path = `/api/v1/trips/${trip.id}/companions`;
    expect((await request(app).get(path)).body).toEqual({ data: { items: [], total: 0 } });
    const added = await request(app).post(path).send({ name: '  Alice  ' });
    expect(added.status).toBe(201);
    expect(added.body).toEqual({ data: { id: expect.any(String), tripId: trip.id, name: 'Alice' } });
    const first = added.body.data;
    expect(first.id).toMatch(/^[\da-f-]{36}$/);
    const duplicate = await request(app).post(path).send({ name: 'Alice' });
    expect(duplicate.status).toBe(201); expect(duplicate.body.data.id).not.toBe(first.id);
    const renamed = await request(app).patch(`${path}/${first.id}`).send({ name: '  李明  ' });
    expect(renamed.status).toBe(200); expect(renamed.body.data).toEqual({ ...first, name: '李明' });
    const row = await db.companion.findUniqueOrThrow({ where: { id: first.id } });
    expect(row.name).toBe('李明'); expect(row.tripId).toBe(trip.id);
    expect((await request(app).patch(`${path}/${first.id}`).send({ name: '李明' })).status).toBe(200);
    const expected = await db.companion.findMany({ where: { tripId: trip.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, tripId: true, name: true } });
    expect((await request(app).get(path)).body).toEqual({ data: { items: expected, total: 2 } });
  });
  it('uses id as the deterministic tie-breaker for equal creation times', async () => {
    const trip = await newTrip(); const createdAt = new Date('2026-01-01T00:00:00Z');
    const ids = ['00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'];
    for (const id of ids) await db.companion.create({ data: { id, tripId: trip.id, name: 'Same name', createdAt } });
    expect((await companions.list(trip.id)).items.map(c => c.id)).toEqual([...ids].sort());
  });
  it('returns 404 for missing Trips/Companions and cross-Trip references without writes or leaks', async () => {
    const a = await newTrip(); const b = await newTrip();
    const person = await companions.create(a.id, { name: 'Private A' });
    const count = await db.companion.count(); const absent = crypto.randomUUID();
    for (const tripId of [absent, b.id]) {
      const response = await request(app).patch(`/api/v1/trips/${tripId}/companions/${person.id}`).send({ name: 'Intruder' });
      expect(response.status).toBe(404); expect(response.body.error).toMatchObject({ code: 'NOT_FOUND', details: null });
      expect(JSON.stringify(response.body)).not.toContain('Private A');
    }
    expect((await request(app).get(`/api/v1/trips/${absent}/companions`)).status).toBe(404);
    expect((await request(app).post(`/api/v1/trips/${absent}/companions`).send({ name: 'X' })).status).toBe(404);
    expect((await request(app).patch(`/api/v1/trips/${a.id}/companions/${absent}`).send({ name: 'X' })).status).toBe(404);
    expect(await db.companion.count()).toBe(count);
    expect((await db.companion.findUniqueOrThrow({ where: { id: person.id } })).name).toBe('Private A');
    expect((await companions.list(b.id)).items).toEqual([]);
  });
  it('rejects invalid IDs/queries and invalid POST/PATCH bodies without changing rows', async () => {
    const trip = await newTrip(); const person = await companions.create(trip.id, { name: 'Keep' });
    const path = `/api/v1/trips/${trip.id}/companions`;
    for (const method of ['get', 'post', 'patch'] as const) {
      const suffix = method === 'patch' ? `/${person.id}` : '';
      expect((await request(app)[method](`/api/v1/trips/bad/companions${suffix}`).send({ name: 'X' })).status).toBe(400);
      expect((await request(app)[method](`${path}${suffix}?page=1`).send({ name: 'X' })).status).toBe(400);
    }
    expect((await request(app).patch(`${path}/bad`).send({ name: 'X' })).status).toBe(400);
    const before = await db.companion.findMany();
    for (const body of [{}, { name: ' ' }, { name: 1 }, { name: 'X', tripId: crypto.randomUUID() }, { name: 'X', extra: true }]) {
      for (const method of ['post', 'patch'] as const) {
        const response = await request(app)[method](path + (method === 'patch' ? `/${person.id}` : '')).send(body);
        expect(response.status).toBe(422); expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    }
    expect(await db.companion.findMany()).toEqual(before);
    expect((await request(app).delete(`${path}/${person.id}`)).status).toBe(404);
    expect(await db.companion.findMany()).toEqual(before);
  });
  it('leaves TripConfig, Trip timestamps and serialized PlannerInput unchanged after add/rename', async () => {
    const trip = await newTrip();
    const planner = async (): Promise<PlannerInput> => ({ trip: await db.$transaction(tx => readTrip(tx, trip.id)), selectedPois: [], defaultTravelMode: 'walk', fxRates: [] });
    const before = JSON.stringify(await planner()); const row = await db.trip.findUniqueOrThrow({ where: { id: trip.id } });
    const person = await companions.create(trip.id, { name: 'First' });
    await companions.patch(trip.id, person.id, { name: 'Renamed' });
    expect(JSON.stringify(await planner())).toBe(before);
    expect(await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).toEqual(row);
  });
  it('rolls back failed database mutations', async () => {
    const trip = await newTrip(); const person = await companions.create(trip.id, { name: 'Keep' });
    const before = await db.companion.findMany();
    await db.$executeRawUnsafe(`CREATE TRIGGER a05_fail_insert BEFORE INSERT ON Companion BEGIN SELECT RAISE(ABORT, 'controlled failure'); END`);
    await db.$executeRawUnsafe(`CREATE TRIGGER a05_fail_update AFTER UPDATE ON Companion BEGIN SELECT RAISE(ABORT, 'controlled failure'); END`);
    try {
      await expect(companions.create(trip.id, { name: 'Fail' })).rejects.toThrow();
      await expect(companions.patch(trip.id, person.id, { name: 'Fail' })).rejects.toThrow();
      expect(await db.companion.findMany()).toEqual(before);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER a05_fail_insert');
      await db.$executeRawUnsafe('DROP TRIGGER a05_fail_update');
    }
  });
});

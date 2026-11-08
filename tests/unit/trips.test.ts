import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createTripsRouter } from '../../apps/api/src/features/trips/router.js';
import { readTrip } from '../../apps/api/src/features/trips/service.js';
import { createTripService } from '../../apps/api/src/features/trips/service.js';
import { isMacauPoint, originOptions } from '../../apps/api/src/features/trips/origins.js';
const dir = mkdtempSync(join(tmpdir(), 'tripmate-a04-'));
const db = new PrismaClient({ datasourceUrl: `file:${join(dir, 'trip.db').replaceAll('\\', '/')}` });
const app = express(); app.use(express.json()); app.use('/api/v1', createTripsRouter(db));
beforeAll(async () => {
  await db.$queryRaw`SELECT 1`;
  const run = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', resolve('apps/api/prisma/schema.prisma')], { env: { ...process.env, DATABASE_URL: `file:${join(dir, 'trip.db').replaceAll('\\', '/')}` }, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stdout + run.stderr);
});
afterAll(async () => { await db.$disconnect(); rmSync(dir, { recursive: true, force: true }); });
const valid = () => ({ title: '澳门两日', startDate: '2028-02-28', endDate: '2028-02-29',
  origin: { label: originOptions[0]!.label, position: originOptions[0]!.position, source: 'curated' },
  dayWindows: [{ date: '2028-02-28', start: '09:00', end: '18:00' }, { date: '2028-02-29', start: '10:00', end: '19:00' }], interests: ['history'], budget: null });
describe('A-04 Trip API and real SQLite', () => {
  it('creates, lists, reopens and updates shared TripConfig without storage/private fields', async () => {
    const created = await request(app).post('/api/v1/trips').send({ ...valid(), budget: { amountMinor: Number.MAX_SAFE_INTEGER, currency: 'MOP' } });
    expect(created.status).toBe(201); const trip = created.body.data;
    expect(trip.pace).toBe('standard'); expect(trip.budget.amountMinor).toBe(Number.MAX_SAFE_INTEGER);
    expect((await request(app).get(`/api/v1/trips/${trip.id}`)).body.data).toEqual(trip);
    expect((await request(app).get('/api/v1/trips')).body.data.items).toContainEqual(trip);
    await db.companion.create({ data: { tripId: trip.id, name: 'Private' } });
    expect(await db.$transaction(tx => readTrip(tx, trip.id))).toEqual(trip);
    const patched = await request(app).patch(`/api/v1/trips/${trip.id}`).send({ title: '新名称', budget: null, interests: [] });
    expect(patched.status).toBe(200); expect(patched.body.data).toEqual({ ...trip, title: '新名称', budget: null, interests: [] });
    const before = await db.trip.findUnique({ where: { id: trip.id }, include: { dayWindows: true } });
    expect((await request(app).patch(`/api/v1/trips/${trip.id}`).send({ endDate: '2028-03-01' })).status).toBe(422);
    expect(await db.trip.findUnique({ where: { id: trip.id }, include: { dayWindows: true } })).toEqual(before);
    const dayWindows = [{ date: '2028-03-01', start: '08:00', end: '12:00' }];
    expect((await request(app).patch(`/api/v1/trips/${trip.id}`).send({ startDate: '2028-03-01', endDate: '2028-03-01', dayWindows })).body.data.dayWindows).toEqual(dayWindows);
    expect(await db.dayWindow.count({ where: { tripId: trip.id } })).toBe(1);
  });
  it.each([
    { title: '' }, { startDate: '2027-02-29' }, { endDate: '2028-02-27' }, { startDate: '2028-02-30' },
    { startDate: '2028-2-28' }, { dayWindows: [] }, { dayWindows: [valid().dayWindows[0], valid().dayWindows[0]] },
    { dayWindows: [{ date: '2028-03-01', start: '09:00', end: '18:00' }] },
    { dayWindows: [{ date: '2028-02-28', start: '18:00', end: '09:00' }] },
    { dayWindows: [{ date: '2028-02-28', start: '09:05', end: '18:00' }] },
    { budget: { amountMinor: -1, currency: 'MOP' } }, { budget: { amountMinor: 1.2, currency: 'MOP' } },
    { budget: { amountMinor: 9007199254740992, currency: 'MOP' } }, { budget: { amountMinor: 1, currency: 'USD' } },
    { interests: ['history', 'history'] }, { interests: ['unknown'] }, { companions: [] }, { id: crypto.randomUUID() },
    { origin: { ...valid().origin, position: { lat: 22.27, lng: 113.54 } } },
    { origin: { ...valid().origin, label: 'Forged curated' } },
  ])('rejects invalid input without writes: %j', async patch => {
    const count = await db.trip.count();
    const response = await request(app).post('/api/v1/trips').send({ ...valid(), ...patch });
    expect(response.status).toBe(422); expect(response.body.error.details.fields.length).toBeGreaterThan(0);
    expect(await db.trip.count()).toBe(count);
  });
  it('handles unknown fields, missing fields, IDs, queries and disabled pace', async () => {
    const { budget: _budget, ...missing } = valid();
    void _budget;
    expect((await request(app).post('/api/v1/trips').send(missing)).status).toBe(422);
    expect((await request(app).get('/api/v1/trips/not-uuid')).status).toBe(400);
    expect((await request(app).get(`/api/v1/trips/${crypto.randomUUID()}`)).status).toBe(404);
    expect((await request(app).get('/api/v1/trips?page=1')).status).toBe(400);
    const created = (await request(app).post('/api/v1/trips').send(valid())).body.data;
    expect((await request(app).patch(`/api/v1/trips/${created.id}`).send({})).status).toBe(422);
    expect((await request(app).patch(`/api/v1/trips/${created.id}`).send({ origin: { label: 'partial' } })).status).toBe(422);
    expect((await request(app).post('/api/v1/trips').send({ ...valid(), pace: 'relaxed' })).body.error.code).toBe('OPTION_NOT_ENABLED');
  });
  it('checks geographic polygons, excluding sea and mainland inside the rough bounding rectangle', async () => {
    expect(isMacauPoint(22.197486389830942, 113.54086971865576)).toBe(true);
    expect(isMacauPoint(22.27, 113.54)).toBe(false);
    expect(isMacauPoint(22.18, 113.60)).toBe(false);
    expect(isMacauPoint(22.14, 113.50)).toBe(false);
    const response = await request(app).post('/api/v1/trips').send({ ...valid(), origin: { ...valid().origin, source: 'manual' } });
    expect(response.status).toBe(201);
    const list = await request(app).get('/api/v1/origins'); expect(list.body.data.total).toBe(originOptions.length);
  });
  it('rolls back the Trip and removed windows if a replacement insert fails', async () => {
    const service = createTripService(db); const trip = await service.create(valid());
    const before = await db.trip.findUnique({ where: { id: trip.id }, include: { dayWindows: true } });
    await db.$executeRawUnsafe(`CREATE TRIGGER a04_fail_window BEFORE INSERT ON DayWindow BEGIN SELECT RAISE(ABORT, 'controlled storage failure'); END`);
    try {
      await expect(service.patch(trip.id, { title: 'Must rollback', dayWindows: valid().dayWindows })).rejects.toThrow();
      expect(await db.trip.findUnique({ where: { id: trip.id }, include: { dayWindows: true } })).toEqual(before);
    } finally { await db.$executeRawUnsafe('DROP TRIGGER a04_fail_window'); }
  });
});

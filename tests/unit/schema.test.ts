import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { POI, TripConfig, PlannerInput, PlanResult, TimeOverride } from '@tripmate/contracts';

const directory = mkdtempSync(join(tmpdir(), 'tripmate-a03-'));
const url = `file:${join(directory, 'schema.db').replaceAll('\\', '/')}`;
const db = new PrismaClient({ datasourceUrl: url });
const schema = resolve('apps/api/prisma/schema.prisma');
function migrate(path: string) {
  const run = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', path], {
    env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 30000,
  });
  if (run.status !== 0) throw new Error(`${run.error ?? ''}\n${run.stdout}\n${run.stderr}`);
}
beforeAll(async () => {
  // Reproduce an existing A-01 installation, including Prisma migration history.
  const bootstrap = '20261102000000_bootstrap';
  mkdirSync(join(directory, 'migrations', bootstrap), { recursive: true });
  copyFileSync(schema, join(directory, 'schema.prisma'));
  copyFileSync(resolve('apps/api/prisma/migrations/migration_lock.toml'), join(directory, 'migrations/migration_lock.toml'));
  copyFileSync(resolve(`apps/api/prisma/migrations/${bootstrap}/migration.sql`), join(directory, 'migrations', bootstrap, 'migration.sql'));
  await db.$queryRaw`SELECT 1`;
  migrate(join(directory, 'schema.prisma'));
  await db.demoWorkspace.create({ data: { id: 'existing-bootstrap-record' } });
  migrate(schema);
}, 60000);
afterAll(async () => { await db.$disconnect(); rmSync(directory, { recursive: true, force: true }); });

const tripData = () => ({ title: 'Controlled fixture', startDate: '2026-11-03', endDate: '2026-11-03',
  originLabel: 'Test point', originLat: 22.1987, originLng: 113.5439, originSource: 'manual', interests: ['history'] });
const poiData = () => ({ name: 'Synthetic POI (not travel advice)', category: 'history', tags: [], lat: 22.1987,
  lng: 113.5439, address: 'Fixture', verification: 'unknown' });
const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

describe('A-03 migrated SQLite schema', () => {
  it('preserves bootstrap data and deploy is repeatable', async () => {
    expect(await db.demoWorkspace.count()).toBe(1);
    migrate(schema);
    expect(await db.demoWorkspace.findUnique({ where: { id: 'existing-bootstrap-record' } })).not.toBeNull();
    const history = await db.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
    expect(history.map(row => row.migration_name)).toEqual(['20261102000000_bootstrap', '20261103000000_a03_domain_schema']);
    expect(await db.$queryRaw`PRAGMA foreign_key_check`).toEqual([]);
  });
  it('generates UUIDs, separates companions, and enforces one window per date', async () => {
    const trip = await db.trip.create({ data: { ...tripData(), dayWindows: { create: { date: '2026-11-03', start: '09:00', end: '18:00' } } } });
    expect(trip.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    await expect(db.dayWindow.create({ data: { tripId: trip.id, date: '2026-11-03', start: '10:00', end: '11:00' } })).rejects.toMatchObject({ code: 'P2002' });
    await db.companion.createMany({ data: [{ tripId: trip.id, name: 'Same' }, { tripId: trip.id, name: 'Same' }] });
    const person = await db.companion.findFirstOrThrow({ where: { tripId: trip.id } });
    await db.companion.update({ where: { id: person.id }, data: { name: 'Renamed' } });
    expect(await db.trip.findUnique({ where: { id: trip.id } })).toEqual(trip);
  });
  it('keeps Favorites independent, rejects duplicates and preserves explicit target order', async () => {
    const trip = await db.trip.create({ data: tripData() });
    const [p, q] = await Promise.all([db.pOI.create({ data: poiData() }), db.pOI.create({ data: poiData() })]);
    await db.favorite.create({ data: { poiId: p.id } });
    expect(await db.tripTarget.count({ where: { tripId: trip.id } })).toBe(0);
    await db.tripTarget.createMany({ data: [{ tripId: trip.id, poiId: q.id, position: 0 }, { tripId: trip.id, poiId: p.id, position: 1 }] });
    await expect(db.tripTarget.create({ data: { tripId: trip.id, poiId: p.id, position: 2 } })).rejects.toMatchObject({ code: 'P2002' });
    await expect(db.favorite.create({ data: { poiId: p.id } })).rejects.toMatchObject({ code: 'P2002' });
    await expect(db.tripTarget.create({ data: { tripId: trip.id, poiId: (await db.pOI.create({ data: poiData() })).id, position: 0 } })).rejects.toMatchObject({ code: 'P2002' });
    expect((await db.tripTarget.findMany({ where: { tripId: trip.id }, orderBy: { position: 'asc' } })).map(t => t.poiId)).toEqual([q.id, p.id]);
    await db.tripTarget.deleteMany({ where: { tripId: trip.id, poiId: p.id } });
    expect(await db.favorite.findUnique({ where: { poiId: p.id } })).not.toBeNull();
    await db.trip.delete({ where: { id: trip.id } });
    expect(await db.favorite.findUnique({ where: { poiId: p.id } })).not.toBeNull();
  });
  it('rejects missing foreign keys and protects referenced POIs', async () => {
    const p = await db.pOI.create({ data: poiData() });
    await expect(db.tripTarget.create({ data: { tripId: crypto.randomUUID(), poiId: p.id, position: 0 } })).rejects.toMatchObject({ code: 'P2003' });
    await expect(db.favorite.create({ data: { poiId: crypto.randomUUID() } })).rejects.toMatchObject({ code: 'P2003' });
    await expect(db.companion.create({ data: { tripId: crypto.randomUUID(), name: 'Missing trip' } })).rejects.toMatchObject({ code: 'P2003' });
    await db.favorite.create({ data: { poiId: p.id } });
    await expect(db.pOI.delete({ where: { id: p.id } })).rejects.toMatchObject({ code: 'P2003' });
    await db.favorite.delete({ where: { poiId: p.id } });
    const trip = await db.trip.create({ data: tripData() });
    await db.tripTarget.create({ data: { tripId: trip.id, poiId: p.id, position: 0 } });
    await expect(db.pOI.delete({ where: { id: p.id } })).rejects.toMatchObject({ code: 'P2003' });
  });
  it('distinguishes unknown hours/prices from closed hours/free admission', async () => {
    const unknown = await db.pOI.create({ data: { ...poiData(), openingHours: Prisma.DbNull } });
    const closed = await db.pOI.create({ data: { ...poiData(), openingHours: [], priceAmountMinor: 0, priceCurrency: 'MOP' } });
    expect(unknown.openingHours).toBeNull(); expect(unknown.priceAmountMinor).toBeNull();
    expect(closed.openingHours).toEqual([]); expect(closed.priceAmountMinor).toBe(0n);
    await expect(db.pOI.create({ data: { ...poiData(), openingHours: Prisma.JsonNull } })).rejects.toThrow();
  });
  it('round-trips safe integer money beyond the signed 32-bit range', async () => {
    const trip = await db.trip.create({ data: { ...tripData(), budgetAmountMinor: BigInt(Number.MAX_SAFE_INTEGER), budgetCurrency: 'MOP' } });
    expect(Number(trip.budgetAmountMinor)).toBe(Number.MAX_SAFE_INTEGER);
    const poi = await db.pOI.create({ data: { ...poiData(), priceAmountMinor: 3000000000n, priceCurrency: 'HKD' } });
    expect(Number(poi.priceAmountMinor)).toBe(3000000000);
    await expect(db.trip.create({ data: { ...tripData(), budgetAmountMinor: 9007199254740992n, budgetCurrency: 'MOP' } })).rejects.toThrow();
  });
  it.each([
    { endDate: '2026-11-02' }, { budgetAmountMinor: 100 }, { budgetCurrency: 'MOP' },
    { budgetAmountMinor: -1, budgetCurrency: 'MOP' }, { budgetAmountMinor: 1, budgetCurrency: 'USD' },
    { title: ' ' }, { originSource: 'guessed' }, { pace: 'fast' },
  ])('rejects invalid Trip storage values: %j', async invalid => {
    await expect(db.trip.create({ data: { ...tripData(), ...invalid } })).rejects.toThrow();
  });
  it('rejects invalid windows, blank companion, invalid POI and rolls back nested writes', async () => {
    const before = await db.trip.count();
    await expect(db.trip.create({ data: { ...tripData(), dayWindows: { create: { date: '2026-11-03', start: '18:00', end: '18:00' } } } })).rejects.toThrow();
    expect(await db.trip.count()).toBe(before);
    const trip = await db.trip.create({ data: tripData() });
    for (const [start, end] of [['24:00', '25:00'], ['9:00', '10:00'], ['10:00', '09:00']] as const) {
      await expect(db.dayWindow.create({ data: { tripId: trip.id, date: '2026-11-03', start, end } })).rejects.toThrow();
    }
    await expect(db.companion.create({ data: { tripId: trip.id, name: ' ' } })).rejects.toThrow();
    for (const invalid of [{ category: 'invalid' }, { suggestedVisitMinutes: 0 }, { priceAmountMinor: 10 }, { priceAmountMinor: -1, priceCurrency: 'MOP' }]) {
      await expect(db.pOI.create({ data: { ...poiData(), ...invalid } })).rejects.toThrow();
    }
  });
  it('restores complete diagnostic snapshots, isolates source changes and uses atomic version predicates', async () => {
    const trip = await db.trip.create({ data: { ...tripData(), companions: { create: { name: 'Private' } }, dayWindows: { create: { date: '2026-11-03', start: '09:00', end: '18:00' } } } });
    const p = await db.pOI.create({ data: poiData() });
    const config: TripConfig = { id: trip.id, title: trip.title, startDate: trip.startDate, endDate: trip.endDate,
      origin: { label: trip.originLabel, position: { lat: trip.originLat, lng: trip.originLng }, source: 'manual' },
      dayWindows: [{ date: '2026-11-03', start: '09:00', end: '18:00' }], interests: ['history'], budget: null, pace: 'standard' };
    const poi: POI = { id: p.id, name: p.name, category: 'history', tags: [], position: { lat: p.lat, lng: p.lng }, address: p.address,
      openingHours: null, suggestedVisitMinutes: null, price: null, verification: 'unknown', sourceUrl: null, checkedAt: null, bookingNote: null };
    const input: PlannerInput = { trip: config, selectedPois: [poi], defaultTravelMode: 'walk', fxRates: [] };
    const stopId = crypto.randomUUID();
    const result: PlanResult = { tripId: trip.id, status: 'needs_review', days: [{ date: trip.startDate,
      stops: [{ id: stopId, poiId: p.id, date: trip.startDate, arrive: null, start: '10:00', end: '10:30' }],
      legs: [{ fromPoiId: null, toPoiId: p.id, mode: 'bus', durationMinutes: null, estimatedCost: null, estimateStatus: 'unknown' }] }],
      unscheduled: [], warnings: [{ code: 'UNKNOWN_TRAVEL', poiId: p.id, message: 'Controlled fixture', severity: 'warning' }], estimatedTotalCost: null };
    const overrides: TimeOverride[] = [{ stopId, start: '10:00', end: '10:30' }];
    const data = { tripId: trip.id, input: json(input), result: json(result), timeOverrides: json(overrides) };
    const saved = await db.savedItinerary.create({ data });
    await db.savedItinerary.create({ data }); // Multiple saved plans per Trip.
    await db.tripTarget.create({ data: { tripId: trip.id, poiId: p.id, position: 0 } });
    await db.trip.update({ where: { id: trip.id }, data: { title: 'Changed source' } });
    await db.pOI.update({ where: { id: p.id }, data: { name: 'Changed source' } });
    await db.tripTarget.deleteMany({ where: { tripId: trip.id } });
    await db.pOI.delete({ where: { id: p.id } });
    const restored = await db.savedItinerary.findUniqueOrThrow({ where: { id: saved.id } });
    expect(restored.input).toEqual(input); expect(restored.result).toEqual(result); expect(restored.timeOverrides).toEqual(overrides);
    const writes = await Promise.all([1, 2].map(() => db.savedItinerary.updateMany({ where: { id: saved.id, tripId: trip.id, version: 1 }, data: { version: { increment: 1 } } })));
    expect(writes.map(w => w.count).sort()).toEqual([0, 1]);
    await expect(db.savedItinerary.create({ data: { ...data, version: 0 } })).rejects.toThrow();
    await expect(db.savedItinerary.create({ data: { ...data, result: { tripId: crypto.randomUUID() } } })).rejects.toThrow();
    await expect(db.savedItinerary.create({ data: { ...data, input: {} } })).rejects.toThrow();
    await db.trip.delete({ where: { id: trip.id } });
    expect(await db.savedItinerary.count({ where: { tripId: trip.id } })).toBe(0);
    expect(await db.dayWindow.count({ where: { tripId: trip.id } })).toBe(0);
    expect(await db.companion.count({ where: { tripId: trip.id } })).toBe(0);
  });
});

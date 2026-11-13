import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readTrip } from '../../../apps/api/src/features/trips/service.js';
import { readTargets } from '../../../apps/api/src/features/targets/service.js';
import { createPoiService } from '../../../apps/api/src/features/pois/poi.service.js';
import { generatePlan } from '../../../apps/api/src/features/planning/index.js';

// Isolated, synthetic fixtures: no claims about actual Macau opening hours or routes.
const directory = mkdtempSync(join(tmpdir(), 'tripmate-c01-integration-'));
const url = `file:${join(directory, 'integration.db').replaceAll('\\', '/')}`;
const db = new PrismaClient({ datasourceUrl: url });
const tripId = '10000000-0000-4000-8000-000000000001';
const openPoiId = '20000000-0000-4000-8000-000000000001';
const closedPoiId = '20000000-0000-4000-8000-000000000002';
const favoriteOnlyId = '20000000-0000-4000-8000-000000000003';

beforeAll(async () => {
  await db.$queryRaw`SELECT 1`;
  const run = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/api/prisma/schema.prisma'], {
    env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 30000,
  });
  if (run.status !== 0) throw new Error(`${run.error ?? ''}\n${run.stdout}\n${run.stderr}`);
  await db.trip.create({ data: {
    id: tripId, title: 'Synthetic integration trip', startDate: '2026-11-09', endDate: '2026-11-09',
    originLabel: 'Synthetic origin', originLat: 22.2, originLng: 113.5, originSource: 'manual', interests: [],
    dayWindows: { create: { date: '2026-11-09', start: '10:00', end: '18:00' } },
  } });
  for (const [id, hours] of [
    [openPoiId, [{ weekday: 1, open: '09:00', close: '18:00', lastEntry: '17:00' }]],
    [closedPoiId, []], [favoriteOnlyId, []],
  ] as const) {
    await db.pOI.create({ data: {
      id, name: 'Synthetic POI', category: 'history', tags: ['SYNTHETIC_TEST_ONLY'],
      lat: 22.2, lng: 113.5, address: 'Synthetic address', openingHours: [...hours],
      suggestedVisitMinutes: 30, priceAmountMinor: 0n, priceCurrency: 'MOP', verification: 'estimated',
    } });
  }
  await db.tripTarget.createMany({ data: [
    { tripId, poiId: openPoiId, position: 0 }, { tripId, poiId: closedPoiId, position: 1 },
  ] });
  await db.favorite.create({ data: { poiId: favoriteOnlyId } });
}, 60000);

afterAll(async () => {
  await db.$disconnect();
  const target = resolve(directory);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('tripmate-c01-integration-')) {
    throw new Error('Unexpected test cleanup path');
  }
  rmSync(target, { recursive: true, force: true });
});

describe('C-01 compatibility with A and B read services', () => {
  it('plans ordered targets from a shared snapshot without including a favorite or persisting an itinerary', async () => {
    const result = await db.$transaction(async tx => {
      const trip = await readTrip(tx, tripId);
      const targets = await readTargets(tx, tripId);
      const pois = createPoiService(tx);
      const selectedPois = await Promise.all(targets.poiIds.map(id => pois.get(id)));
      if (selectedPois.some(poi => poi === null)) throw new Error('Synthetic target POI missing');
      return generatePlan({ trip, selectedPois: selectedPois.filter(poi => poi !== null), defaultTravelMode: 'walk', fxRates: [] });
    });

    expect(result.tripId).toBe(tripId);
    expect(result.days.flatMap(day => day.stops.map(stop => stop.poiId))).toEqual([openPoiId]);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId: closedPoiId, code: 'CLOSED' })]);
    expect(result.days.flatMap(day => day.stops.map(stop => stop.poiId))).not.toContain(favoriteOnlyId);
    expect(result.unscheduled.map(item => item.poiId)).not.toContain(favoriteOnlyId);
    expect(await db.savedItinerary.count()).toBe(0);
    expect((await readTargets(db, tripId)).poiIds).toEqual([openPoiId, closedPoiId]);
  });
});

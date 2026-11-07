import { expect, test } from '@playwright/test';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type {
  CandidatePlan,
  EditCommand,
  PlanResult,
  PlannerInput,
  PlannerService,
} from '@tripmate/contracts';
import { createItinerariesRouter } from '../../apps/api/src/features/itineraries/router.js';

const tripId = '90000000-0000-4000-8000-000000000001';
const stopId = '91000000-0000-4000-8000-000000000001';
const poiId = '92000000-0000-4000-8000-000000000001';

const tempDirectory = mkdtempSync(join(tmpdir(), 'tripmate-d05-'));
const databaseUrl = `file:${join(tempDirectory, 'saved.db').replaceAll('\\', '/')}`;
const db = new PrismaClient({ datasourceUrl: databaseUrl });
let sourceChanged = false;

const plannerInput: PlannerInput = {
  trip: {
    id: tripId,
    title: 'D-05 persistence fixture',
    startDate: '2026-11-10',
    endDate: '2026-11-10',
    origin: {
      label: 'Synthetic origin',
      position: { lat: 22.1975, lng: 113.5408 },
      source: 'manual',
    },
    dayWindows: [{ date: '2026-11-10', start: '09:00', end: '18:00' }],
    interests: ['history'],
    budget: null,
    pace: 'standard',
  },
  selectedPois: [
    {
      id: poiId,
      name: 'Synthetic stop',
      category: 'history',
      tags: [],
      position: { lat: 22.198, lng: 113.541 },
      address: 'Synthetic address',
      openingHours: [{ weekday: 2, open: '09:00', close: '18:00', lastEntry: '17:30' }],
      suggestedVisitMinutes: 60,
      price: null,
      verification: 'estimated',
      sourceUrl: null,
      checkedAt: null,
      bookingNote: null,
    },
  ],
  defaultTravelMode: 'walk',
  fxRates: [],
};

const initialResult: PlanResult = {
  tripId,
  status: 'feasible',
  days: [
    {
      date: '2026-11-10',
      stops: [
        {
          id: stopId,
          poiId,
          date: '2026-11-10',
          arrive: '10:00',
          start: '10:00',
          end: '11:00',
        },
      ],
      legs: [
        {
          fromPoiId: null,
          toPoiId: poiId,
          mode: 'walk',
          durationMinutes: 10,
          estimatedCost: null,
          estimateStatus: 'estimated',
        },
      ],
    },
  ],
  unscheduled: [],
  warnings: [],
  estimatedTotalCost: null,
};

const planner: PlannerService = {
  generatePlan: () => structuredClone(initialResult),
  revalidateAndRecalculate: (input) => {
    const result = structuredClone(input.current);
    const command = input.command;
    if (command.type === 'setVisitTime') {
      const stop = result.days
        .flatMap((day) => day.stops)
        .find((candidate) => candidate.id === command.stopId);
      if (stop) {
        stop.start = command.start;
        stop.end = command.end;
      }
    }
    return result;
  },
};

const candidate = (commands: EditCommand[] = []): CandidatePlan => {
  let result = structuredClone(initialResult);
  for (const command of commands) {
    result = planner.revalidateAndRecalculate({
      trip: plannerInput.trip,
      allPois: plannerInput.selectedPois,
      current: result,
      command,
      fxRates: [],
      timeOverrides: commands.flatMap((item) =>
        item.type === 'setVisitTime'
          ? [{ stopId: item.stopId, start: item.start, end: item.end }]
          : [],
      ),
    });
  }
  return {
    input: structuredClone(plannerInput),
    result,
    commands,
  };
};

const app = express();
app.use(express.json());
app.use(
  '/api/v1',
  createItinerariesRouter(db, {
    planner,
    verifySource: async () => !sourceChanged,
  }),
);

test.beforeAll(async () => {
  // Prisma on first-run Windows needs the SQLite file initialized before migrate deploy.
  await db.$queryRaw`SELECT 1`;
  const migration = spawnSync(
    process.execPath,
    [
      'node_modules/prisma/build/index.js',
      'migrate',
      'deploy',
      '--schema',
      resolve('apps/api/prisma/schema.prisma'),
    ],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
    },
  );
  if (migration.status !== 0) throw new Error(migration.stdout + migration.stderr);

  await db.trip.create({
    data: {
      id: tripId,
      title: plannerInput.trip.title,
      startDate: plannerInput.trip.startDate,
      endDate: plannerInput.trip.endDate,
      originLabel: plannerInput.trip.origin.label,
      originLat: plannerInput.trip.origin.position.lat,
      originLng: plannerInput.trip.origin.position.lng,
      originSource: plannerInput.trip.origin.source,
      interests: plannerInput.trip.interests,
      budgetAmountMinor: null,
      budgetCurrency: null,
      pace: plannerInput.trip.pace,
      dayWindows: {
        create: plannerInput.trip.dayWindows,
      },
    },
  });
});

test.beforeEach(async () => {
  sourceChanged = false;
  await db.savedItinerary.deleteMany();
});

test.afterAll(async () => {
  await db.$disconnect();
  rmSync(tempDirectory, { recursive: true, force: true });
});

test.describe('D-05 SavedItinerary API with real SQLite', () => {
  test('creates, lists and reopens an exact saved snapshot', async () => {
    const created = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({ mode: 'create', candidate: candidate() });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      tripId,
      version: 1,
      input: plannerInput,
      result: initialResult,
      timeOverrides: [],
    });

    const itineraryId = created.body.data.id as string;
    const reopened = await request(app).get(`/api/v1/itineraries/${itineraryId}`);
    expect(reopened.status).toBe(200);
    expect(reopened.body.data).toEqual(created.body.data);

    const listed = await request(app).get(`/api/v1/trips/${tripId}/itineraries`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(1);
    expect(listed.body.data.items[0]).toEqual(created.body.data);
  });

  test('overwrites with expectedVersion and rejects stale writes without changing data', async () => {
    const created = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({ mode: 'create', candidate: candidate() });
    const itineraryId = created.body.data.id as string;
    const command: EditCommand = {
      type: 'setVisitTime',
      stopId,
      start: '11:00',
      end: '11:30',
    };

    const overwritten = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({
        mode: 'overwrite',
        itineraryId,
        expectedVersion: 1,
        confirmed: true,
        candidate: candidate([command]),
      });

    expect(overwritten.status).toBe(200);
    expect(overwritten.body.data.version).toBe(2);
    expect(overwritten.body.data.result.days[0].stops[0]).toMatchObject({
      start: '11:00',
      end: '11:30',
    });
    expect(overwritten.body.data.timeOverrides).toEqual([
      { stopId, start: '11:00', end: '11:30' },
    ]);

    const stale = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({
        mode: 'overwrite',
        itineraryId,
        expectedVersion: 1,
        confirmed: true,
        candidate: candidate([command]),
      });

    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    const unchanged = await request(app).get(`/api/v1/itineraries/${itineraryId}`);
    expect(unchanged.body.data).toEqual(overwritten.body.data);
  });

  test('rejects changed source before writing', async () => {
    sourceChanged = true;
    const response = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({ mode: 'create', candidate: candidate() });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SOURCE_CHANGED');
    expect(await db.savedItinerary.count()).toBe(0);
  });
});

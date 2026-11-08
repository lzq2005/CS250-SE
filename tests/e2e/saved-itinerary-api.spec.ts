import { expect, test } from '@playwright/test';
import express from 'express';
import request from 'supertest';
import { Prisma, PrismaClient } from '@prisma/client';
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
const writerDb = new PrismaClient({ datasourceUrl: databaseUrl });
let sourceChanged = false;
let plannerFailure: unknown = null;
let generatedResult: PlanResult | null = null;
let sourceVerifier:
  | ((input: PlannerInput, tx: Prisma.TransactionClient) => Promise<boolean>)
  | null = null;

function throwPlannerFailure(): void {
  if (plannerFailure) throw plannerFailure;
}

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

const overnightDiagnosticResult: PlanResult = {
  ...structuredClone(initialResult),
  status: 'infeasible',
  days: [
    {
      ...structuredClone(initialResult.days[0]!),
      stops: [
        {
          ...structuredClone(initialResult.days[0]!.stops[0]!),
          start: '23:50',
          end: null,
        },
      ],
    },
  ],
  warnings: [
    {
      code: 'DAY_END',
      poiId,
      message: '2026-11-10 的下一日（2026-11-11）00:20 结束。',
      severity: 'error',
    },
  ],
};

const planner: PlannerService = {
  generatePlan: () => {
    throwPlannerFailure();
    return structuredClone(generatedResult ?? initialResult);
  },
  revalidateAndRecalculate: (input) => {
    throwPlannerFailure();
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
    verifySource: async (input, tx) => {
      if (sourceChanged) return false;
      if (sourceVerifier) return sourceVerifier(input, tx);
      const trip = await tx.trip.findUnique({
        where: { id: input.trip.id },
        select: { title: true },
      });
      return trip?.title === input.trip.title;
    },
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
  await db.$queryRawUnsafe('PRAGMA journal_mode = WAL');
  await writerDb.$queryRawUnsafe('PRAGMA journal_mode = WAL');

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
  plannerFailure = null;
  generatedResult = null;
  sourceVerifier = null;
  await db.savedItinerary.deleteMany();
  await db.trip.update({
    where: { id: tripId },
    data: { title: plannerInput.trip.title },
  });
});

test.afterAll(async () => {
  await writerDb.$disconnect();
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

  test('rejects a malformed trip UUID as BAD_REQUEST without writing', async () => {
    const response = await request(app)
      .post('/api/v1/trips/not-a-uuid/itineraries')
      .send({ mode: 'create', candidate: candidate() });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(await db.savedItinerary.count()).toBe(0);
  });

  test('binds source verification to the write transaction and never publishes a stale snapshot', async () => {
    let markVerificationRead!: () => void;
    let releaseVerification!: () => void;
    const verificationRead = new Promise<void>((resolve) => {
      markVerificationRead = resolve;
    });
    const verificationRelease = new Promise<void>((resolve) => {
      releaseVerification = resolve;
    });

    sourceVerifier = async (input, tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: input.trip.id },
        select: { title: true },
      });
      markVerificationRead();
      await verificationRelease;
      return trip?.title === input.trip.title;
    };

    const responsePromise = Promise.resolve(
      request(app)
        .post(`/api/v1/trips/${tripId}/itineraries`)
        .send({ mode: 'create', candidate: candidate() }),
    );

    await verificationRead;
    await writerDb.trip.update({
      where: { id: tripId },
      data: { title: 'changed after source verification' },
    });
    releaseVerification();

    const response = await responsePromise;
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('STORAGE_UNAVAILABLE');
    expect(await db.savedItinerary.count()).toBe(0);
  });

  test('maps explicit planner validation failures to a safe 422 response', async () => {
    plannerFailure = Object.assign(
      new Error('private query SELECT * FROM /private/tripmate.db'),
      { code: 'VALIDATION_ERROR' },
    );

    const response = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({ mode: 'create', candidate: candidate() });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual({
      fields: [{ path: 'candidate', reason: '规划输入或命令无效' }],
    });
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(await db.savedItinerary.count()).toBe(0);
  });

  test('sanitizes unknown planner failures on create without writing', async () => {
    plannerFailure = new Error('private query at C:\\secret\\tripmate.db');

    const response = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({ mode: 'create', candidate: candidate() });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(await db.savedItinerary.count()).toBe(0);
  });

  test('sanitizes unknown planner failures on saved edit without changing the snapshot', async () => {
    const created = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({ mode: 'create', candidate: candidate() });
    const itineraryId = created.body.data.id as string;
    plannerFailure = new Error('private SQL SELECT * FROM SavedItinerary');

    const response = await request(app)
      .post(`/api/v1/itineraries/${itineraryId}/edits`)
      .send({
        expectedVersion: 1,
        command: { type: 'setVisitTime', stopId, start: '11:00', end: '11:30' },
      });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect((await request(app).get(`/api/v1/itineraries/${itineraryId}`)).body.data)
      .toEqual(created.body.data);
  });

  test('rejects every malformed stored snapshot as DATA_INTEGRITY_ERROR', async () => {
    const corruptions: Array<{
      field: 'input' | 'result' | 'timeOverrides';
      value: Prisma.InputJsonValue;
    }> = [
      {
        field: 'input',
        value: {
          trip: { id: tripId },
          selectedPois: [],
          defaultTravelMode: 'rocket',
          fxRates: [],
        },
      },
      {
        field: 'result',
        value: {
          tripId,
          days: [],
          status: 'BROKEN',
          warnings: 'NOT_AN_ARRAY',
        },
      },
      {
        field: 'timeOverrides',
        value: [{ stopId, start: '10:07', end: '10:22' }],
      },
    ];

    for (const corruption of corruptions) {
      await db.savedItinerary.deleteMany();
      const created = await request(app)
        .post(`/api/v1/trips/${tripId}/itineraries`)
        .send({ mode: 'create', candidate: candidate() });
      const itineraryId = created.body.data.id as string;
      await db.savedItinerary.update({
        where: { id: itineraryId },
        data: { [corruption.field]: corruption.value },
      });
      const before = await db.savedItinerary.findUniqueOrThrow({ where: { id: itineraryId } });

      const getResponse = await request(app).get(`/api/v1/itineraries/${itineraryId}`);
      const listResponse = await request(app).get(`/api/v1/trips/${tripId}/itineraries`);
      const editResponse = await request(app)
        .post(`/api/v1/itineraries/${itineraryId}/edits`)
        .send({
          expectedVersion: 1,
          command: { type: 'removeStop', stopId, confirmed: true },
        });

      for (const response of [getResponse, listResponse, editResponse]) {
        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('DATA_INTEGRITY_ERROR');
      }
      const after = await db.savedItinerary.findUniqueOrThrow({ where: { id: itineraryId } });
      expect(after.version).toBe(before.version);
      expect(after.updatedAt).toEqual(before.updatedAt);
    }
  });

  test('maps malformed Express route encoding to BAD_REQUEST', async () => {
    const response = await request(app).get('/api/v1/itineraries/%E0%A4%A');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  test('preserves a valid overnight diagnostic with an independently nullable end time', async () => {
    generatedResult = overnightDiagnosticResult;

    const created = await request(app)
      .post(`/api/v1/trips/${tripId}/itineraries`)
      .send({
        mode: 'create',
        candidate: {
          input: structuredClone(plannerInput),
          result: structuredClone(overnightDiagnosticResult),
          commands: [],
        },
      });

    expect(created.status).toBe(201);
    expect(created.body.data.result).toMatchObject({
      status: 'infeasible',
      days: [{ stops: [{ start: '23:50', end: null }] }],
      warnings: [{ code: 'DAY_END', severity: 'error' }],
    });

    const itineraryId = created.body.data.id as string;
    const reopened = await request(app).get(`/api/v1/itineraries/${itineraryId}`);
    const listed = await request(app).get(`/api/v1/trips/${tripId}/itineraries`);
    expect(reopened.status).toBe(200);
    expect(reopened.body.data).toEqual(created.body.data);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items[0]).toEqual(created.body.data);

    const edited = await request(app)
      .post(`/api/v1/itineraries/${itineraryId}/edits`)
      .send({
        expectedVersion: 1,
        command: {
          type: 'setTransportMode',
          date: '2026-11-10',
          toPoiId: poiId,
          mode: 'bus',
        },
      });
    expect(edited.status).toBe(200);
    expect(edited.body.data.result.days[0].stops[0]).toMatchObject({
      start: '23:50',
      end: null,
    });
    expect(edited.body.data.result.warnings).toContainEqual(
      expect.objectContaining({ code: 'DAY_END', severity: 'error' }),
    );
  });

  test('rejects snapshots missing required dates at the beginning, middle or end', async () => {
    const cases = [
      {
        startDate: '2026-11-09',
        endDate: '2026-11-10',
        dayWindows: [{ date: '2026-11-10', start: '09:00', end: '18:00' }],
        days: [structuredClone(initialResult.days[0]!)],
      },
      {
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        dayWindows: [
          { date: '2026-11-10', start: '09:00', end: '18:00' },
          { date: '2026-11-12', start: '09:00', end: '18:00' },
        ],
        days: [
          structuredClone(initialResult.days[0]!),
          { date: '2026-11-12', stops: [], legs: [] },
        ],
      },
      {
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        dayWindows: [{ date: '2026-11-11', start: '09:00', end: '18:00' }],
        days: [{ ...structuredClone(initialResult.days[0]!), date: '2026-11-11' }],
      },
      {
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        dayWindows: [{ date: '2026-11-10', start: '09:00', end: '18:00' }],
        days: [structuredClone(initialResult.days[0]!)],
      },
    ];

    for (const item of cases) {
      await db.savedItinerary.deleteMany();
      const created = await request(app)
        .post(`/api/v1/trips/${tripId}/itineraries`)
        .send({ mode: 'create', candidate: candidate() });
      const itineraryId = created.body.data.id as string;
      const corruptInput = structuredClone(plannerInput);
      corruptInput.trip.startDate = item.startDate;
      corruptInput.trip.endDate = item.endDate;
      corruptInput.trip.dayWindows = item.dayWindows;
      await db.savedItinerary.update({
        where: { id: itineraryId },
        data: {
          input: corruptInput,
          result: {
            ...structuredClone(initialResult),
            days: item.days,
          },
        },
      });
      const before = await db.savedItinerary.findUniqueOrThrow({ where: { id: itineraryId } });

      const getResponse = await request(app).get(`/api/v1/itineraries/${itineraryId}`);
      const listResponse = await request(app).get(`/api/v1/trips/${tripId}/itineraries`);
      const editResponse = await request(app)
        .post(`/api/v1/itineraries/${itineraryId}/edits`)
        .send({
          expectedVersion: 1,
          command: { type: 'removeStop', stopId, confirmed: true },
        });

      for (const response of [getResponse, listResponse, editResponse]) {
        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('DATA_INTEGRITY_ERROR');
      }
      const after = await db.savedItinerary.findUniqueOrThrow({ where: { id: itineraryId } });
      expect(after.version).toBe(before.version);
      expect(after.updatedAt).toEqual(before.updatedAt);
    }
  });
});

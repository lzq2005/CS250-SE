import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  EditCommand,
  PlannerInput,
  PlannerService,
  PlanResult,
  SavedItinerary,
  SaveItineraryRequest,
  TimeOverride,
} from '@tripmate/contracts';
import { ItineraryError } from './errors.js';
import { replayCandidate, replaySavedEdit } from './replay.js';
import { validateStoredSnapshot } from './snapshot.js';

export type SavedItineraryDependencies = {
  planner: PlannerService;
  /**
   * Must read and compare Trip, Targets, POIs and FX through the supplied transaction.
   * Opening an independent connection would reintroduce the source-change window.
   */
  verifySource: (
    input: PlannerInput,
    tx: Prisma.TransactionClient,
  ) => Promise<boolean>;
};

type SavedRow = Prisma.SavedItineraryGetPayload<Record<string, never>>;

function toSaved(row: SavedRow): SavedItinerary {
  const { input, result, timeOverrides } = validateStoredSnapshot(
    row.input,
    row.result,
    row.timeOverrides,
    row.tripId,
  );
  return {
    id: row.id,
    tripId: row.tripId,
    version: row.version,
    input,
    result,
    timeOverrides,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function json<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

async function ensureTrip(db: Prisma.TransactionClient | PrismaClient, tripId: string): Promise<void> {
  const trip = await db.trip.findUnique({ where: { id: tripId }, select: { id: true } });
  if (!trip) throw new ItineraryError(404, 'NOT_FOUND', '找不到旅行。');
}

function ensureCandidateTrip(candidate: SaveItineraryRequest['candidate'], tripId: string): void {
  if (candidate.input.trip.id !== tripId || candidate.result.tripId !== tripId) {
    throw new ItineraryError(422, 'VALIDATION_ERROR', '候选行程不属于指定旅行。', {
      fields: [{ path: 'candidate', reason: 'tripId 不一致' }],
    });
  }
}

async function verifyAndReplay(
  tx: Prisma.TransactionClient,
  candidate: SaveItineraryRequest['candidate'],
  dependencies: SavedItineraryDependencies,
): Promise<{ result: PlanResult; timeOverrides: TimeOverride[] }> {
  const sourceUnchanged = await dependencies.verifySource(candidate.input, tx);
  if (!sourceUnchanged) {
    throw new ItineraryError(409, 'SOURCE_CHANGED', 'Trip、targets、POI 或 FX 已变化，请重新生成。');
  }
  return replayCandidate(
    candidate.input,
    candidate.commands,
    candidate.result,
    dependencies.planner,
  );
}

export function createSavedItineraryService(
  db: PrismaClient,
  dependencies: SavedItineraryDependencies,
) {
  return {
    async create(tripId: string, candidate: SaveItineraryRequest['candidate']): Promise<SavedItinerary> {
      ensureCandidateTrip(candidate, tripId);
      return db.$transaction(async (tx) => {
        await ensureTrip(tx, tripId);
        const replayed = await verifyAndReplay(tx, candidate, dependencies);
        const row = await tx.savedItinerary.create({
          data: {
            tripId,
            version: 1,
            input: json(candidate.input),
            result: json(replayed.result),
            timeOverrides: json(replayed.timeOverrides),
          },
        });
        return toSaved(row);
      });
    },

    async list(tripId: string): Promise<{ items: SavedItinerary[]; total: number }> {
      await ensureTrip(db, tripId);
      const rows = await db.savedItinerary.findMany({
        where: { tripId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      const items = rows.map(toSaved);
      return { items, total: items.length };
    },

    async get(itineraryId: string): Promise<SavedItinerary> {
      const row = await db.savedItinerary.findUnique({ where: { id: itineraryId } });
      if (!row) throw new ItineraryError(404, 'NOT_FOUND', '找不到已保存行程。');
      return toSaved(row);
    },

    async overwrite(
      tripId: string,
      request: Extract<SaveItineraryRequest, { mode: 'overwrite' }>,
    ): Promise<SavedItinerary> {
      ensureCandidateTrip(request.candidate, tripId);
      return db.$transaction(async (tx) => {
        const current = await tx.savedItinerary.findUnique({ where: { id: request.itineraryId } });
        if (!current || current.tripId !== tripId) {
          throw new ItineraryError(404, 'NOT_FOUND', '找不到要覆盖的已保存行程。');
        }
        if (current.version !== request.expectedVersion) {
          throw new ItineraryError(409, 'VERSION_CONFLICT', '行程已被其他操作更新。', {
            expectedVersion: request.expectedVersion,
            actualVersion: current.version,
          });
        }
        const replayed = await verifyAndReplay(tx, request.candidate, dependencies);
        const updated = await tx.savedItinerary.updateMany({
          where: {
            id: request.itineraryId,
            tripId,
            version: request.expectedVersion,
          },
          data: {
            version: { increment: 1 },
            input: json(request.candidate.input),
            result: json(replayed.result),
            timeOverrides: json(replayed.timeOverrides),
          },
        });
        if (updated.count !== 1) {
          throw new ItineraryError(409, 'VERSION_CONFLICT', '行程已被其他操作更新。', {
            expectedVersion: request.expectedVersion,
          });
        }
        const row = await tx.savedItinerary.findUniqueOrThrow({
          where: { id: request.itineraryId },
        });
        return toSaved(row);
      });
    },

    async edit(
      itineraryId: string,
      expectedVersion: number,
      command: EditCommand,
    ): Promise<SavedItinerary> {
      return db.$transaction(async (tx) => {
        const currentRow = await tx.savedItinerary.findUnique({ where: { id: itineraryId } });
        if (!currentRow) throw new ItineraryError(404, 'NOT_FOUND', '找不到已保存行程。');
        const current = toSaved(currentRow);
        if (current.version !== expectedVersion) {
          throw new ItineraryError(409, 'VERSION_CONFLICT', '行程已被其他操作更新。', {
            expectedVersion,
            actualVersion: current.version,
          });
        }
        const replayed = replaySavedEdit(
          current.input,
          current.result,
          command,
          current.timeOverrides,
          dependencies.planner,
        );
        const updated = await tx.savedItinerary.updateMany({
          where: { id: itineraryId, version: expectedVersion },
          data: {
            version: { increment: 1 },
            result: json(replayed.result),
            timeOverrides: json(replayed.timeOverrides),
          },
        });
        if (updated.count !== 1) {
          throw new ItineraryError(409, 'VERSION_CONFLICT', '行程已被其他操作更新。', {
            expectedVersion,
          });
        }
        const row = await tx.savedItinerary.findUniqueOrThrow({ where: { id: itineraryId } });
        return toSaved(row);
      });
    },
  };
}

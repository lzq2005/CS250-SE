import { Prisma, type PrismaClient } from '@prisma/client';
import { Router, type NextFunction, type Request, type Response } from 'express';
import type { Failure } from '@tripmate/contracts';
import { ItineraryError } from './errors.js';
import {
  createSavedItineraryService,
  type SavedItineraryDependencies,
} from './service.js';
import {
  validateEditRequest,
  validateSaveRequest,
  validateUuid,
} from './validation.js';

function failure(status: number, code: string, message: string, details: Record<string, unknown> | null = null): {
  status: number;
  body: Failure;
} {
  return { status, body: { error: { code, message, details } } };
}

export function createItinerariesRouter(
  db: PrismaClient,
  dependencies: SavedItineraryDependencies,
): Router {
  const router = Router();
  const service = createSavedItineraryService(db, dependencies);

  router.post('/trips/:tripId/itineraries', async (req, res, next) => {
    try {
      const tripId = validateUuid(req.params.tripId, 'tripId');
      const request = validateSaveRequest(req.body);
      const saved = request.mode === 'create'
        ? await service.create(tripId, request.candidate)
        : await service.overwrite(tripId, request);
      return res.status(request.mode === 'create' ? 201 : 200).json({ data: saved });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/trips/:tripId/itineraries', async (req, res, next) => {
    try {
      const tripId = validateUuid(req.params.tripId, 'tripId');
      return res.json({ data: await service.list(tripId) });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/itineraries/:itineraryId', async (req, res, next) => {
    try {
      return res.json({ data: await service.get(validateUuid(req.params.itineraryId, 'itineraryId')) });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/itineraries/:itineraryId/edits', async (req, res, next) => {
    try {
      const itineraryId = validateUuid(req.params.itineraryId, 'itineraryId');
      const { expectedVersion, command } = validateEditRequest(req.body);
      return res.json({ data: await service.edit(itineraryId, expectedVersion, command) });
    } catch (error) {
      return next(error);
    }
  });

  router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof ItineraryError) {
      const result = failure(error.status, error.code, error.message, error.details);
      return res.status(result.status).json(result.body);
    }
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'P2024'].includes(error.code))
    ) {
      const result = failure(503, 'STORAGE_UNAVAILABLE', '数据库暂时不可用。');
      return res.status(result.status).json(result.body);
    }
    return next(error);
  });

  return router;
}

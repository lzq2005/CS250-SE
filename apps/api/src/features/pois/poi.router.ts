import { Prisma } from '@prisma/client';
import { Router, type Response, type NextFunction, type ErrorRequestHandler } from 'express';
import type { Failure, List, POI, Success } from '@tripmate/contracts';
import { prisma } from '../../db.js';
import { isCategory, isUuid, PoiIntegrityError } from './poi.dto.js';
import { createPoiService, type PoiDatabase, type PoiFilters } from './poi.service.js';

function fail(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message, details: null } } satisfies Failure);
}
function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof PoiIntegrityError) return fail(res, 409, 'DATA_INTEGRITY_ERROR', 'POI data is unavailable because it is invalid.');
  if (error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'P2021', 'P2022', 'P2024'].includes(error.code))) {
    return fail(res, 503, 'STORAGE_UNAVAILABLE', 'Database is unavailable.');
  }
  return next(error);
}

export function createPoisRouter(database: PoiDatabase = prisma): Router {
  const router = Router();
  const service = createPoiService(database);
  router.get('/pois', async (req, res, next) => {
    const query = req.query;
    if (Object.keys(query).some(key => !['search', 'category', 'favoriteOnly'].includes(key)) ||
      Object.values(query).some(value => typeof value !== 'string')) {
      return fail(res, 400, 'BAD_REQUEST', 'Only single search, category and favoriteOnly query values are supported.');
    }
    if ((query.category !== undefined && !isCategory(query.category)) ||
      (query.favoriteOnly !== undefined && query.favoriteOnly !== 'true' && query.favoriteOnly !== 'false')) {
      return fail(res, 400, 'BAD_REQUEST', 'Invalid category or favoriteOnly query.');
    }
    const filters: PoiFilters = {
      search: query.search as string | undefined,
      category: query.category as PoiFilters['category'], favoriteOnly: query.favoriteOnly === 'true',
    };
    try { return res.json({ data: await service.list(filters) } satisfies Success<List<POI>>); }
    catch (error) { return handleError(error, res, next); }
  });
  router.get('/pois/:poiId', async (req, res, next) => {
    if (!isUuid(req.params.poiId) || Object.keys(req.query).length > 0) {
      return fail(res, 400, 'BAD_REQUEST', 'A UUID poiId and no detail query parameters are required.');
    }
    try {
      const poi = await service.get(req.params.poiId);
      return poi ? res.json({ data: poi } satisfies Success<POI>) : fail(res, 404, 'NOT_FOUND', 'POI not found.');
    } catch (error) { return handleError(error, res, next); }
  });
  // Express decodes route parameters before the UUID handler runs.
  const errors: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (error instanceof URIError) return fail(res, 400, 'BAD_REQUEST', 'Invalid POI URL encoding.');
    return handleError(error, res, next);
  };
  router.use(errors);
  return router;
}

import { Router } from 'express';
import { Prisma, type PrismaClient } from '@prisma/client';
import { createTripService } from './service.js';
import { TripError } from './validation.js';
import { originOptions } from './origins.js';
import { createCompanionService } from './companions.js';

export function createTripsRouter(db: PrismaClient) {
  const router = Router(); const service = createTripService(db);
  const companions = createCompanionService(db);
  router.use(['/trips', '/origins'], (req, _res, next) => {
    if (Object.keys(req.query).length) return next(new TripError(400, 'BAD_REQUEST', '不支持查询参数。'));
    next();
  });
  router.param('tripId', (_req, _res, next, id: string) => {
    next(/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id) ? undefined : new TripError(400, 'BAD_REQUEST', '无效 UUID。'));
  });
  router.get('/origins', (_req, res) => res.json({ data: { items: originOptions, total: originOptions.length } }));
  router.param('companionId', (_req, _res, next, id: string) => {
    next(/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id) ? undefined : new TripError(400, 'BAD_REQUEST', '无效 UUID。'));
  });
  router.get('/trips', async (_req, res) => res.json({ data: await service.list() }));
  router.post('/trips', async (req, res) => res.status(201).json({ data: await service.create(req.body) }));
  router.get('/trips/:tripId', async (req, res) => res.json({ data: await service.get(req.params.tripId) }));
  router.patch('/trips/:tripId', async (req, res) => res.json({ data: await service.patch(req.params.tripId, req.body) }));
  router.get('/trips/:tripId/companions', async (req, res) => res.json({ data: await companions.list(req.params.tripId) }));
  router.post('/trips/:tripId/companions', async (req, res) => res.status(201).json({ data: await companions.create(req.params.tripId, req.body) }));
  router.patch('/trips/:tripId/companions/:companionId', async (req, res) => res.json({ data: await companions.patch(req.params.tripId, req.params.companionId, req.body) }));
  router.use((error: unknown, _req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (error instanceof TripError) return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
    if (error instanceof Prisma.PrismaClientInitializationError || (error instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P1002', 'P1003', 'P1008', 'P1017', 'P2024'].includes(error.code))) return res.status(503).json({ error: { code: 'STORAGE_UNAVAILABLE', message: '数据库暂时不可用。', details: null } });
    next(error);
  });
  return router;
}

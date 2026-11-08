import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { Success, TargetsView } from '@tripmate/contracts';
import { invalidBody, noBody, noQuery, relationErrors, uuid } from '../favorites/http.js';
import { createTargetService } from './service.js';

export function createTargetsRouter(db: PrismaClient): Router {
  const router = Router(); const service = createTargetService(db);
  router.get('/trips/:tripId/targets', async (req, res) => {
    noQuery(req.query); noBody(req.body);
    res.json({ data: await service.get(uuid(req.params.tripId, 'tripId')) } satisfies Success<TargetsView>);
  });
  router.post('/trips/:tripId/targets', async (req, res) => {
    noQuery(req.query); const tripId = uuid(req.params.tripId, 'tripId');
    const body: unknown = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'poiId')) {
      invalidBody('Send exactly one poiId field.');
    }
    const poiId = uuid((body as Record<string, unknown>).poiId, 'poiId');
    res.status(201).json({ data: await service.add(tripId, poiId) } satisfies Success<TargetsView>);
  });
  router.delete('/trips/:tripId/targets/:poiId', async (req, res) => {
    noQuery(req.query); noBody(req.body);
    res.json({ data: await service.remove(uuid(req.params.tripId, 'tripId'), uuid(req.params.poiId, 'poiId')) } satisfies Success<TargetsView>);
  });
  router.use(relationErrors);
  return router;
}

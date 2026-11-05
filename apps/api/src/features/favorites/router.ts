import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { FavoriteState, Success } from '@tripmate/contracts';
import { invalidBody, noBody, noQuery, relationErrors, uuid } from './http.js';
import { createFavoriteService } from './service.js';

export function createFavoritesRouter(db: PrismaClient): Router {
  const router = Router(); const service = createFavoriteService(db);
  router.get('/favorites/:poiId', async (req, res) => {
    noQuery(req.query); noBody(req.body);
    res.json({ data: await service.get(uuid(req.params.poiId, 'poiId')) } satisfies Success<FavoriteState>);
  });
  router.put('/favorites/:poiId', async (req, res) => {
    noQuery(req.query); const poiId = uuid(req.params.poiId, 'poiId');
    const body: unknown = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) invalidBody('Send an empty JSON object.');
    res.json({ data: await service.put(poiId) } satisfies Success<FavoriteState>);
  });
  router.delete('/favorites/:poiId', async (req, res) => {
    noQuery(req.query); noBody(req.body);
    res.json({ data: await service.remove(uuid(req.params.poiId, 'poiId')) } satisfies Success<FavoriteState>);
  });
  router.use(relationErrors);
  return router;
}

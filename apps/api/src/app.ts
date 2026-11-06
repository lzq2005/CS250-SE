import express, { type ErrorRequestHandler, type Router } from 'express';
import type { Failure, Health, Member, Success } from '@tripmate/contracts';
import { probeDatabase } from './db.js';
import { prisma } from './db.js';
import { createTripsRouter } from './features/trips/router.js';
import { createPoisRouter } from './features/pois/poi.router.js';
export type FeatureModule = { owner: Member; router: Router };
export function createApp(options: { probe?: () => Promise<void>; modules?: FeatureModule[] } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/v1/health', async (_req, res) => {
    try {
      await (options.probe ?? probeDatabase)();
      res.json({ data: { status: 'ok', database: 'ok' } } satisfies Success<Health>);
    } catch {
      res.status(503).json({ error: { code: 'STORAGE_UNAVAILABLE', message: 'Database is unavailable.', details: null } } satisfies Failure);
    }
  });
  // Owners export routers with paths relative to /api/v1; only A registers here.
  app.use('/api/v1', createTripsRouter(prisma));
  // Explicit modules replace the defaults for owner-isolated module tests.
  for (const feature of options.modules ?? [{ owner: 'B', router: createPoisRouter(prisma) }]) app.use('/api/v1', feature.router);
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.', details: null } } satisfies Failure));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const badJson = error instanceof SyntaxError;
    res.status(badJson ? 400 : 500).json({ error: { code: badJson ? 'BAD_REQUEST' : 'INTERNAL_ERROR', message: badJson ? 'Invalid JSON.' : 'Request failed.', details: null } } satisfies Failure);
  };
  app.use(errors);
  return app;
}

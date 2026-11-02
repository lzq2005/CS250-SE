import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../../apps/api/src/app.js';
import { prisma } from '../../apps/api/src/db.js';
afterAll(async () => prisma.$disconnect());
describe('bootstrap HTTP boundary', () => {
  it('checks the real SQLite connection', async () => {
    const result = await request(createApp()).get('/api/v1/health');
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ data: { status: 'ok', database: 'ok' } });
  });
  it('can write and roll back infrastructure metadata in SQLite', async () => {
    const id = 'bootstrap-' + crypto.randomUUID();
    await expect(prisma.$transaction(async tx => {
      await tx.demoWorkspace.create({ data: { id } });
      throw new Error('rollback fixture');
    })).rejects.toThrow('rollback fixture');
    expect(await prisma.demoWorkspace.findUnique({ where: { id } })).toBeNull();
  });
  it('returns 503 without leaking storage errors', async () => {
    const result = await request(createApp({ probe: async () => { throw new Error('private db path'); } })).get('/api/v1/health');
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ error: { code: 'STORAGE_UNAVAILABLE', message: 'Database is unavailable.', details: null } });
  });
  it('returns the shared 404 envelope for missing business modules', async () => {
    const result = await request(createApp()).get('/api/v1/plaza/posts');
    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe('NOT_FOUND');
  });
  it('lets owners register routers without a second API process', async () => {
    const router = express.Router();
    router.get('/fixture', (_req, res) => res.json({ data: 'connected' }));
    const app = createApp({ modules: [{ owner: 'B', router }] });
    expect((await request(app).get('/api/v1/fixture')).body).toEqual({ data: 'connected' });
    expect((await request(app).post('/api/v1/fixture').set('Content-Type', 'application/json').send('{')).status).toBe(400);
  });
});

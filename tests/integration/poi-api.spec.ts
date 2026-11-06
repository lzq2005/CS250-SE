import { expect, test } from '@playwright/test';

test('production entry registers POIs once under /api/v1 alongside Trips', async ({ request }) => {
  const list = await request.get('/api/v1/pois');
  expect(list.status()).toBe(200);
  expect((await list.json()).data.total).toBe(5);
  expect((await request.get('/api/v1/trips')).status()).toBe(200);
  expect((await request.get('/api/v1/origins')).status()).toBe(200);
  for (const path of ['/pois', '/api/pois', '/api/v1/api/v1/pois']) {
    const missing = await request.get(`http://127.0.0.1:5182${path}`);
    expect(missing.status()).toBe(404);
    expect((await missing.json()).error.code).toBe('NOT_FOUND');
  }
});

test('production Router preserves shared errors and read-only counts', async ({ request }) => {
  const before = (await (await request.get('/api/v1/pois')).json()).data;
  const filtered = await request.get('/api/v1/pois?search=大三巴&category=history');
  expect((await filtered.json()).data.items[0].id).toBe('8913d2bd-feaf-509d-8c02-560ef2e41510');
  const bad = await request.get('/api/v1/pois?category=invalid');
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error).toEqual({ code: 'BAD_REQUEST', message: expect.any(String), details: null });
  expect((await request.get('/api/v1/pois/not-a-uuid')).status()).toBe(400);
  expect((await request.get('/api/v1/pois/10000000-0000-4000-8000-000000000099')).status()).toBe(404);
  expect((await request.post('/api/v1/pois', { data: {} })).status()).toBe(404);
  expect((await (await request.get('/api/v1/pois')).json()).data).toEqual(before);
});

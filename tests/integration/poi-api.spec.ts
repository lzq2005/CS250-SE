import { expect, test } from '@playwright/test';

test('production Favorites and Targets persist through HTTP and remain independent across Trips', async ({ request }) => {
  const a = '273024e3-ae0c-5172-a486-e460efb96639';
  const b = '8913d2bd-feaf-509d-8c02-560ef2e41510';
  const origin = (await (await request.get('/api/v1/origins')).json()).data.items[0];
  const createTrip = async () => {
    const response = await request.post('/api/v1/trips', { data: { title: 'A relation integration',
      startDate: '2028-02-29', endDate: '2028-02-29',
      origin: { label: origin.label, position: origin.position, source: 'curated' },
      dayWindows: [{ date: '2028-02-29', start: '09:00', end: '18:00' }], interests: [], budget: null } });
    expect(response.status()).toBe(201); return (await response.json()).data;
  };
  const trip = await createTrip(), other = await createTrip();
  const favorite = `/api/v1/favorites/${a}`;
  const path = `/api/v1/trips/${trip.id}/targets`, otherPath = `/api/v1/trips/${other.id}/targets`;
  try {
    for (let repeat = 0; repeat < 2; repeat++) expect((await request.put(favorite, { data: {} })).status()).toBe(200);
    for (const poiId of [b, a]) expect((await request.post(path, { data: { poiId } })).status()).toBe(201);
    expect((await request.post(otherPath, { data: { poiId: a } })).status()).toBe(201);
    const duplicate = await request.post(path, { data: { poiId: a } });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).error.code).toBe('DUPLICATE_TARGET');
    expect((await (await request.get(path)).json()).data.poiIds).toEqual([b, a]);
    expect((await (await request.get('/api/v1/pois?favoriteOnly=true')).json()).data.items.map((poi: { id: string }) => poi.id)).toContain(a);
    for (let repeat = 0; repeat < 2; repeat++) expect((await (await request.delete(`${path}/${a}`)).json()).data.poiIds).toEqual([b]);
    expect((await (await request.get(otherPath)).json()).data.poiIds).toEqual([a]);
    expect((await (await request.get(favorite)).json()).data.favorited).toBe(true);
    for (let repeat = 0; repeat < 2; repeat++) expect((await (await request.delete(favorite)).json()).data.favorited).toBe(false);
    expect((await (await request.get(otherPath)).json()).data.poiIds).toEqual([a]);
    expect((await (await request.get(`/api/v1/trips/${trip.id}`)).json()).data).toEqual(trip);
  } finally {
    await request.delete(favorite);
    for (const targetPath of [path, otherPath]) for (const poiId of [a, b]) await request.delete(`${targetPath}/${poiId}`);
  }
});

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

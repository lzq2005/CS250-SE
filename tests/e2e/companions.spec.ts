import { test, expect } from '@playwright/test';

test('A-05 companion API works through the live app and Vite proxy', async ({ request }) => {
  const origins = await request.get('/api/v1/origins');
  const origin = (await origins.json()).data.items[0];
  const createTrip = async () => {
    const response = await request.post('/api/v1/trips', { data: {
      title: `A05 ${crypto.randomUUID()}`, startDate: '2028-02-29', endDate: '2028-02-29',
      origin: { label: origin.label, position: origin.position, source: 'curated' },
      dayWindows: [{ date: '2028-02-29', start: '09:00', end: '18:00' }], interests: [], budget: null,
    } });
    expect(response.status()).toBe(201); return (await response.json()).data;
  };
  const trip = await createTrip(); const other = await createTrip();
  const path = `/api/v1/trips/${trip.id}/companions`;
  expect(await (await request.get(path)).json()).toEqual({ data: { items: [], total: 0 } });
  const added = await request.post(path, { data: { name: '  Alice  ' } });
  expect(added.status()).toBe(201); const person = (await added.json()).data;
  expect(person).toEqual({ id: expect.any(String), tripId: trip.id, name: 'Alice' });
  const changed = await request.patch(`${path}/${person.id}`, { data: { name: '李明' } });
  expect(changed.status()).toBe(200); expect((await changed.json()).data).toEqual({ ...person, name: '李明' });
  expect((await request.patch(`/api/v1/trips/${other.id}/companions/${person.id}`, { data: { name: 'Wrong Trip' } })).status()).toBe(404);
  expect((await request.post(path, { data: { name: ' ' } })).status()).toBe(422);
  expect((await request.patch(`${path}/invalid`, { data: { name: 'X' } })).status()).toBe(400);
  const badJson = await request.post(path, { data: '{', headers: { 'content-type': 'application/json' } });
  expect(badJson.status()).toBe(400); expect((await badJson.json()).error.code).toBe('BAD_REQUEST');
  expect((await request.delete(`${path}/${person.id}`)).status()).toBe(404);
  expect(await (await request.get(path)).json()).toEqual({ data: { items: [{ ...person, name: '李明' }], total: 1 } });
  expect((await (await request.get(`/api/v1/trips/${trip.id}`)).json()).data).toEqual(trip);
});

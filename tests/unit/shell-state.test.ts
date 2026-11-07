import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TripConfig } from '@tripmate/contracts';
import { resolveRoute } from '../../apps/web/src/router/routes.js';
import { activeTripStorageKey, createActiveTripStore } from '../../apps/web/src/shared/active-trip.js';
const id = 'c0000000-0000-4000-8000-000000000001';
const other = 'c0000000-0000-4000-8000-000000000002';
const trip = (uuid = id): TripConfig => ({ id: uuid, title: 'Synthetic active Trip', startDate: '2026-11-05', endDate: '2026-11-05',
  origin: { label: 'Synthetic', position: { lat: 22.19, lng: 113.54 }, source: 'manual' },
  dayWindows: [{ date: '2026-11-05', start: '09:00', end: '18:00' }], interests: ['history'], budget: null, pace: 'standard' });
const memory = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
};
afterEach(() => vi.unstubAllGlobals());
describe('single Shell route resolution', () => {
  it('separates query from catalogue paths and resolves only bounded POI detail paths', () => {
    expect(resolveRoute('#/discover?category=history&search=a%26b')).toMatchObject({ id: 'discover', search: '?category=history&search=a%26b' });
    expect(resolveRoute(`#/pois/${id}?search=x`)).toMatchObject({ id: 'poi-detail', poiId: id, search: '?search=x', tab: 'discover' });
    expect(resolveRoute('#/trip')).toMatchObject({ id: 'trip' });
    expect(resolveRoute('')).toMatchObject({ id: 'home' }); expect(resolveRoute('#/')).toMatchObject({ id: 'home' });
  });
  it.each(['#/pois/invalid', '#/pois/%E0%A4%A', `#/pois/${id}/extra`, '#/poi-detail', '#//example.com', '#javascript:alert(1)', '#/missing'])('recovers invalid/dynamic unknown address: %s', hash => {
    expect(resolveRoute(hash).id).toBe('not-found');
  });
});
describe('B shared activeTrip state', () => {
  it('persists only UUID on save and clears it explicitly', async () => {
    const storage = memory(), read = vi.fn();
    const store = createActiveTripStore({ storage, readTrip: read });
    store.saved(trip()); expect(store.state.value).toEqual({ status: 'ready', id, trip: trip() });
    expect(storage.getItem(activeTripStorageKey)).toBe(id); expect(read).not.toHaveBeenCalled();
    store.clear(); expect(store.state.value.status).toBe('empty'); expect(storage.getItem(activeTripStorageKey)).toBeNull();
  });
  it('validates stored ID before requesting and restores valid Trip from server', async () => {
    const storage = memory(), read = vi.fn(async () => trip());
    const store = createActiveTripStore({ storage, readTrip: read });
    storage.setItem(activeTripStorageKey, 'invalid'); await store.restore();
    expect(read).not.toHaveBeenCalled(); expect(storage.getItem(activeTripStorageKey)).toBeNull();
    storage.setItem(activeTripStorageKey, id); await store.restore();
    expect(read).toHaveBeenCalledWith(id); expect(store.state.value.status).toBe('ready');
  });
  it('clears missing Trip but retains the ID for a recoverable service failure', async () => {
    const storage = memory(); storage.setItem(activeTripStorageKey, id);
    const read = vi.fn<() => Promise<TripConfig | null>>().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(trip()).mockResolvedValueOnce(null);
    const store = createActiveTripStore({ storage, readTrip: read });
    await store.restore(); expect(store.state.value).toEqual({ status: 'unavailable', id, trip: null });
    expect(storage.getItem(activeTripStorageKey)).toBe(id);
    await store.restore(); expect(store.state.value.status).toBe('ready');
    await store.restore(); expect(store.state.value.status).toBe('empty'); expect(storage.getItem(activeTripStorageKey)).toBeNull();
  });
  it('ignores late restoration after a save, clear or newer restoration', async () => {
    const storage = memory(); storage.setItem(activeTripStorageKey, id);
    let finish!: (value: TripConfig | null) => void;
    const read = vi.fn(() => new Promise<TripConfig | null>(resolve => { finish = resolve; }));
    const store = createActiveTripStore({ storage, readTrip: read });
    const pending = store.restore(); store.saved(trip(other)); finish(trip()); await pending;
    expect(store.state.value.id).toBe(other);
    const cleared = store.restore(); store.clear(); finish(trip(other)); await cleared;
    expect(store.state.value.status).toBe('empty');
    storage.setItem(activeTripStorageKey, id);
    const first = store.restore(); const finishOld = finish;
    const second = store.restore(); finish(trip()); await second;
    finishOld(null); await first; expect(store.state.value.status).toBe('ready');
  });
  it('handles blocked storage without breaking successful in-memory state', async () => {
    const storage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); }, removeItem: () => { throw Error('blocked'); } };
    const store = createActiveTripStore({ storage });
    await store.restore(); expect(store.state.value.status).toBe('empty');
    expect(() => store.saved(trip())).not.toThrow(); expect(store.state.value.status).toBe('ready');
    expect(() => store.clear()).not.toThrow();
  });
  it('uses actual GET boundary semantics and rejects wrong/malformed Trip responses', async () => {
    const storage = memory(); storage.setItem(activeTripStorageKey, id);
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: trip(other) })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: trip() })))
      .mockResolvedValueOnce(new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetcher);
    const store = createActiveTripStore({ storage });
    for (let n = 0; n < 3; n++) { await store.restore(); expect(store.state.value.status).toBe('unavailable'); }
    await store.restore(); expect(store.state.value.status).toBe('ready');
    expect(fetcher).toHaveBeenLastCalledWith(`/api/v1/trips/${id}`, { headers: { Accept: 'application/json' } });
    await store.restore(); expect(store.state.value.status).toBe('empty');
  });
});

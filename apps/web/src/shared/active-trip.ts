import { shallowReadonly, shallowRef } from 'vue';
import type { TripConfig } from '@tripmate/contracts';

export const activeTripStorageKey = 'tripmate.activeTripId';
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type State = { status: 'empty' | 'restoring' | 'ready' | 'unavailable'; id: string | null; trip: TripConfig | null };
type Reader = (id: string) => Promise<TripConfig | null>;
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
function tripShape(value: unknown): value is TripConfig {
  if (!object(value) || !object(value.origin) || !object(value.origin.position)) return false;
  return uuid(value.id) && typeof value.title === 'string' && typeof value.startDate === 'string' && typeof value.endDate === 'string'
    && typeof value.origin.label === 'string' && typeof value.origin.source === 'string' && ['curated', 'manual'].includes(value.origin.source)
    && typeof value.origin.position.lat === 'number' && Number.isFinite(value.origin.position.lat)
    && typeof value.origin.position.lng === 'number' && Number.isFinite(value.origin.position.lng)
    && Math.abs(value.origin.position.lat) <= 90 && Math.abs(value.origin.position.lng) <= 180
    && Array.isArray(value.dayWindows) && value.dayWindows.every(w => object(w) && typeof w.date === 'string' && typeof w.start === 'string' && typeof w.end === 'string')
    && Array.isArray(value.interests) && value.interests.every(c => typeof c === 'string' && ['history', 'food', 'shopping', 'nature'].includes(c))
    && (value.budget === null || (object(value.budget) && typeof value.budget.amountMinor === 'number' && Number.isSafeInteger(value.budget.amountMinor)
      && value.budget.amountMinor >= 0 && typeof value.budget.currency === 'string' && ['MOP', 'HKD', 'CNY'].includes(value.budget.currency)))
    && typeof value.pace === 'string' && ['standard', 'relaxed'].includes(value.pace);
}
async function readTrip(id: string): Promise<TripConfig | null> {
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Trip is temporarily unavailable.');
  const body: unknown = await response.json();
  if (!object(body) || !tripShape(body.data) || body.data.id !== id) throw new Error('Invalid Trip response.');
  return body.data;
}
function browserStorage(): StoragePort | undefined {
  try { return globalThis.localStorage; } catch { return undefined; }
}
export function createActiveTripStore(options: { readTrip?: Reader; storage?: StoragePort } = {}) {
  const state = shallowRef<State>({ status: 'empty', id: null, trip: null });
  let version = 0;
  const storage = () => options.storage ?? browserStorage();
  function persist(id: string | null) {
    try { if (id) storage()?.setItem(activeTripStorageKey, id); else storage()?.removeItem(activeTripStorageKey); }
    catch { /* Memory state still works when browser storage is unavailable. */ }
  }
  function clear() { version++; state.value = { status: 'empty', id: null, trip: null }; persist(null); }
  function saved(trip: TripConfig) {
    if (!tripShape(trip)) throw new Error('Invalid saved Trip.');
    version++; state.value = { status: 'ready', id: trip.id, trip }; persist(trip.id);
  }
  async function restore() {
    const current = ++version;
    let id = state.value.id;
    if (!id) { try { id = storage()?.getItem(activeTripStorageKey) ?? null; } catch { id = null; } }
    if (!uuid(id)) { clear(); return; }
    const requestedId = id;
    state.value = { status: 'restoring', id: requestedId, trip: null };
    try {
      const trip = await (options.readTrip ?? readTrip)(requestedId);
      if (current !== version) return;
      if (trip === null) { clear(); return; }
      if (!tripShape(trip) || trip.id !== requestedId) throw new Error('Invalid restored Trip.');
      state.value = { status: 'ready', id: trip.id, trip }; persist(trip.id);
    } catch {
      if (current === version) state.value = { status: 'unavailable', id: requestedId, trip: null };
    }
  }
  return { state: shallowReadonly(state), saved, clear, restore };
}
// A/B/C/D consume this single production instance; the factory is for isolated tests.
export const activeTrip = createActiveTripStore();

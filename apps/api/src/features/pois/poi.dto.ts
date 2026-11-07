import type { POI as StoredPOI } from '@prisma/client';
import type { Category, Currency, KnownStatus, POI, WeeklyWindow } from '@tripmate/contracts';

export class PoiIntegrityError extends Error {
  constructor() { super('Stored POI does not satisfy the shared contract.'); }
}
const categories: readonly Category[] = ['history', 'food', 'shopping', 'nature'];
const currencies: readonly Currency[] = ['MOP', 'HKD', 'CNY'];
const statuses: readonly KnownStatus[] = ['verified', 'estimated', 'unknown'];
export const isCategory = (value: unknown): value is Category => categories.some(item => item === value);
export const isUuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const time = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const nullableString = (value: unknown) => value === null || typeof value === 'string';
function requireValid(condition: boolean): asserts condition {
  if (!condition) throw new PoiIntegrityError();
}
function openingHours(value: StoredPOI['openingHours']): WeeklyWindow[] | null {
  if (value === null) return null;
  requireValid(Array.isArray(value));
  const windows = value.map(item => {
    requireValid(item !== null && typeof item === 'object' && !Array.isArray(item));
    const { weekday, open, close, lastEntry } = item;
    requireValid(typeof weekday === 'number' && Number.isInteger(weekday) && weekday >= 1 && weekday <= 7);
    requireValid(time(open) && time(close) && open < close);
    requireValid(lastEntry === null || (time(lastEntry) && lastEntry >= open && lastEntry <= close));
    return { weekday, open, close, lastEntry } as WeeklyWindow;
  });
  const sorted = [...windows].sort((a, b) => a.weekday - b.weekday || a.open.localeCompare(b.open));
  requireValid(sorted.every((window, index) => {
    const prior = sorted[index - 1];
    return !prior || prior.weekday !== window.weekday || prior.close <= window.open;
  }));
  return windows;
}

// Whitelist the public DTO: never return raw Prisma rows (BigInt/relations).
export function toPOI(row: StoredPOI): POI {
  requireValid(isUuid(row.id) && typeof row.name === 'string' && row.name.trim().length > 0);
  requireValid(isCategory(row.category));
  requireValid(Array.isArray(row.tags) && row.tags.every(tag => typeof tag === 'string'));
  requireValid(Number.isFinite(row.lat) && row.lat >= -90 && row.lat <= 90);
  requireValid(Number.isFinite(row.lng) && row.lng >= -180 && row.lng <= 180);
  requireValid(typeof row.address === 'string');
  requireValid(row.suggestedVisitMinutes === null || (Number.isSafeInteger(row.suggestedVisitMinutes) && row.suggestedVisitMinutes > 0));
  requireValid(statuses.some(status => status === row.verification));
  requireValid(nullableString(row.sourceUrl) && nullableString(row.bookingNote));
  requireValid(row.checkedAt === null || (row.checkedAt instanceof Date && Number.isFinite(row.checkedAt.getTime())));
  let price: POI['price'] = null;
  if (row.priceAmountMinor === null) requireValid(row.priceCurrency === null);
  else {
    requireValid(typeof row.priceAmountMinor === 'bigint' && row.priceAmountMinor >= 0n && row.priceAmountMinor <= BigInt(Number.MAX_SAFE_INTEGER));
    requireValid(currencies.some(currency => currency === row.priceCurrency));
    price = { amountMinor: Number(row.priceAmountMinor), currency: row.priceCurrency as Currency };
  }
  return {
    id: row.id, name: row.name, category: row.category as Category, tags: [...row.tags] as string[],
    position: { lat: row.lat, lng: row.lng }, address: row.address,
    openingHours: openingHours(row.openingHours), suggestedVisitMinutes: row.suggestedVisitMinutes,
    price, verification: row.verification as KnownStatus, sourceUrl: row.sourceUrl,
    checkedAt: row.checkedAt?.toISOString() ?? null, bookingNote: row.bookingNote,
  };
}

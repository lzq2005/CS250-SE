import { Prisma, type PrismaClient, type POI as StoredPOI } from '@prisma/client';
import type { POI } from '@tripmate/contracts';
import { toPOI } from './poi.dto.js';

const fields = ['id', 'name', 'category', 'tags', 'position', 'address', 'openingHours',
  'suggestedVisitMinutes', 'price', 'verification', 'sourceUrl', 'checkedAt', 'bookingNote'];
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const identityName = (name: string) => name.normalize('NFKC').trim().toLowerCase();

export class PoiSeedError extends Error {}

// Import-only runtime boundary: accepts full shared POIs, not source-review metadata.
// Validation finishes for the ENTIRE batch before any database access.
export function parsePoiSeed(input: unknown): POI[] {
  if (!Array.isArray(input)) throw new PoiSeedError('Seed input must be a complete POI array.');
  const ids = new Set<string>();
  const names = new Set<string>();
  return input.map((value: unknown, index) => {
    try {
      if (!object(value) || !exactKeys(value, fields) || !object(value.position) || !exactKeys(value.position, ['lat', 'lng'])) throw new Error();
      if (value.price !== null && (!object(value.price) || !exactKeys(value.price, ['amountMinor', 'currency'])
        || typeof value.price.amountMinor !== 'number' || !Number.isSafeInteger(value.price.amountMinor) || value.price.amountMinor < 0)) throw new Error();
      if (value.checkedAt !== null && (typeof value.checkedAt !== 'string'
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value.checkedAt)
        || !Number.isFinite(Date.parse(value.checkedAt))
        || new Date(value.checkedAt).toISOString().slice(0, 19) !== value.checkedAt.slice(0, 19))) throw new Error();
      if (value.openingHours !== null && (!Array.isArray(value.openingHours) || value.openingHours.some(window =>
        !object(window) || !exactKeys(window, ['weekday', 'open', 'close', 'lastEntry'])))) throw new Error();
      const price = value.price as POI['price'];
      const row = {
        id: value.id, name: value.name, category: value.category, tags: value.tags,
        lat: value.position.lat, lng: value.position.lng, address: value.address,
        openingHours: value.openingHours, suggestedVisitMinutes: value.suggestedVisitMinutes,
        priceAmountMinor: price === null ? null : BigInt(price.amountMinor), priceCurrency: price?.currency ?? null,
        verification: value.verification, sourceUrl: value.sourceUrl,
        checkedAt: value.checkedAt === null ? null : new Date(value.checkedAt as string), bookingNote: value.bookingNote,
      } as StoredPOI;
      const poi = toPOI(row);
      const key = poi.id.toLowerCase();
      const name = identityName(poi.name);
      if (ids.has(key) || names.has(name)) throw new Error();
      ids.add(key); names.add(name);
      return poi;
    } catch { throw new PoiSeedError(`Invalid, duplicate or incomplete POI at input index ${index}.`); }
  });
}

function storage(poi: POI): Prisma.POIUncheckedCreateInput {
  return {
    id: poi.id, name: poi.name, category: poi.category, tags: [...poi.tags],
    lat: poi.position.lat, lng: poi.position.lng, address: poi.address,
    openingHours: poi.openingHours === null ? Prisma.DbNull : poi.openingHours.map(window => ({ ...window })),
    suggestedVisitMinutes: poi.suggestedVisitMinutes,
    priceAmountMinor: poi.price === null ? null : BigInt(poi.price.amountMinor), priceCurrency: poi.price?.currency ?? null,
    verification: poi.verification, sourceUrl: poi.sourceUrl,
    checkedAt: poi.checkedAt === null ? null : new Date(poi.checkedAt), bookingNote: poi.bookingNote,
  };
}

export type PoiSeedSummary = { dryRun: boolean; total: number; created: number; updated: number; unchanged: number };

// No CLI, default DB import, fixture loading, migration or registration here.
// A's eventual seed entry explicitly supplies approved data and the database.
export async function seedPois(database: Pick<PrismaClient, '$transaction'>, input: unknown,
  options: { dryRun?: boolean } = {}): Promise<PoiSeedSummary> {
  const pois = parsePoiSeed(input);
  const dryRun = options.dryRun !== false;
  return database.$transaction(async tx => {
    const existing = await tx.pOI.findMany();
    const byId = new Map(existing.map(row => [row.id, row]));
    // Review exact normalized-name collisions; never guess a canonical ID or delete/recreate a POI.
    for (const poi of pois) {
      if (existing.some(row => (identityName(row.name) === identityName(poi.name) || row.id.toLowerCase() === poi.id.toLowerCase()) && row.id !== poi.id)) {
        throw new PoiSeedError(`Existing POI identity conflicts with input ID ${poi.id}; review canonical IDs first.`);
      }
    }
    const summary: PoiSeedSummary = { dryRun, total: pois.length, created: 0, updated: 0, unchanged: 0 };
    for (const poi of pois) {
      const current = byId.get(poi.id);
      let equal = false;
      if (current) {
        try { equal = JSON.stringify(toPOI(current)) === JSON.stringify(poi); }
        catch { /* An approved, fully validated replacement can repair this row. */ }
      }
      if (equal) { summary.unchanged++; continue; }
      if (current) summary.updated++; else summary.created++;
      if (!dryRun) {
        const data = storage(poi);
        await tx.pOI.upsert({ where: { id: poi.id }, create: data, update: data });
      }
    }
    return summary;
  });
}

import type { Prisma } from '@prisma/client';
import type { Category, List, POI } from '@tripmate/contracts';
import { toPOI } from './poi.dto.js';

// Accept a Prisma client OR caller-owned read transaction; no nested HTTP calls.
export type PoiDatabase = Pick<Prisma.TransactionClient, 'pOI'>;
export type PoiFilters = { search?: string; category?: Category; favoriteOnly?: boolean };

export function createPoiService(database: PoiDatabase) {
  return {
    async list(filters: PoiFilters = {}): Promise<List<POI>> {
      const rows = await database.pOI.findMany({ where: {
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.favoriteOnly ? { favorites: { some: {} } } : {}),
      } });
      const search = filters.search?.trim().toLowerCase() ?? '';
      const items = rows.map(toPOI).filter(poi => !search || [poi.name, poi.address, ...poi.tags]
        .some(value => value.toLowerCase().includes(search)))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant') || a.id.localeCompare(b.id));
      return { items, total: items.length };
    },
    async get(poiId: string): Promise<POI | null> {
      const row = await database.pOI.findUnique({ where: { id: poiId } });
      return row ? toPOI(row) : null;
    },
  };
}

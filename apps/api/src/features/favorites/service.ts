import type { Prisma, PrismaClient } from '@prisma/client';
import type { FavoriteState } from '@tripmate/contracts';
import { RelationError } from './http.js';
import { relationTransaction } from './transaction.js';

async function requirePoi(tx: Prisma.TransactionClient, poiId: string) {
  if (!await tx.pOI.findUnique({ where: { id: poiId }, select: { id: true } })) {
    throw new RelationError(404, 'NOT_FOUND', 'POI not found.');
  }
}
export function createFavoriteService(db: PrismaClient) {
  return {
    get: (poiId: string): Promise<FavoriteState> => relationTransaction(db, async tx => {
      await requirePoi(tx, poiId);
      return { poiId, favorited: Boolean(await tx.favorite.findUnique({ where: { poiId }, select: { id: true } })) };
    }),
    put: (poiId: string): Promise<FavoriteState> => relationTransaction(db, async tx => {
      await requirePoi(tx, poiId);
      await tx.favorite.upsert({ where: { poiId }, create: { poiId }, update: {} });
      return { poiId, favorited: true };
    }),
    remove: (poiId: string): Promise<FavoriteState> => relationTransaction(db, async tx => {
      await requirePoi(tx, poiId);
      await tx.favorite.deleteMany({ where: { poiId } });
      return { poiId, favorited: false };
    }),
  };
}

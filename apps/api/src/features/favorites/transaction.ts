import { Prisma, type PrismaClient } from '@prisma/client';
import { RelationError } from './http.js';

export async function relationTransaction<T>(db: PrismaClient, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(operation); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2002', 'P2034'].includes(error.code)) throw error;
      // Retry in a NEW transaction. A duplicate target is classified by the actual
      // (tripId,poiId) read; a position collision must never be called DUPLICATE_TARGET.
      if (attempt === 2) throw new RelationError(503, 'STORAGE_UNAVAILABLE', 'Storage is busy; retry the request.');
    }
  }
  throw new RelationError(503, 'STORAGE_UNAVAILABLE', 'Storage is busy; retry the request.');
}

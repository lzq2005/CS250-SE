import type { Prisma, PrismaClient } from '@prisma/client';
import type { TargetsView } from '@tripmate/contracts';
import { RelationError } from '../favorites/http.js';
import { relationTransaction } from '../favorites/transaction.js';

type ReadDb = Pick<Prisma.TransactionClient, 'trip' | 'tripTarget'>;
async function requireTrip(db: ReadDb, tripId: string) {
  if (!await db.trip.findUnique({ where: { id: tripId }, select: { id: true } })) throw new RelationError(404, 'NOT_FOUND', 'Trip not found.');
}
async function view(db: ReadDb, tripId: string): Promise<TargetsView> {
  const rows = await db.tripTarget.findMany({ where: { tripId }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { poiId: true } });
  return { tripId, poiIds: rows.map(row => row.poiId) };
}
// C can call inside its existing read transaction. No POI join that silently
// drops unresolved target IDs; POI resolution is a separate integration boundary.
export async function readTargets(db: ReadDb, tripId: string): Promise<TargetsView> {
  await requireTrip(db, tripId); return view(db, tripId);
}
export function createTargetService(db: PrismaClient) {
  return {
    get: (tripId: string) => relationTransaction(db, tx => readTargets(tx, tripId)),
    add: (tripId: string, poiId: string) => relationTransaction(db, async tx => {
      await requireTrip(tx, tripId);
      if (!await tx.pOI.findUnique({ where: { id: poiId }, select: { id: true } })) throw new RelationError(404, 'NOT_FOUND', 'POI not found.');
      if (await tx.tripTarget.findUnique({ where: { tripId_poiId: { tripId, poiId } }, select: { id: true } })) {
        throw new RelationError(409, 'DUPLICATE_TARGET', 'POI is already a trip target.', { tripId, poiId });
      }
      const last = await tx.tripTarget.aggregate({ where: { tripId }, _max: { position: true } });
      const position = (last._max.position ?? -1) + 1;
      if (!Number.isSafeInteger(position) || position > 2147483647) throw new RelationError(409, 'DATA_INTEGRITY_ERROR', 'Target order is invalid.');
      await tx.tripTarget.create({ data: { tripId, poiId, position } });
      return view(tx, tripId);
    }),
    remove: (tripId: string, poiId: string) => relationTransaction(db, async tx => {
      await requireTrip(tx, tripId);
      // Do not look up POI: repeated deletion and dangling-reference cleanup are both valid.
      await tx.tripTarget.deleteMany({ where: { tripId, poiId } });
      return view(tx, tripId);
    }),
  };
}

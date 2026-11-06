import type { Prisma, PrismaClient } from '@prisma/client';
import type { Companion, List } from '@tripmate/contracts';
import { object, TripError } from './validation.js';

export function validateCompanionName(body: unknown): string {
  const value = object(body, ['name'], 'companion');
  if (typeof value.name !== 'string' || !value.name.trim()) {
    throw new TripError(422, 'VALIDATION_ERROR', '请输入同行人姓名。', {
      fields: [{ path: 'name', reason: '必须为非空字符串' }],
    });
  }
  return value.name.trim();
}

// Explicit projection keeps storage metadata outside the shared DTO.
const select = { id: true, tripId: true, name: true } as const;
export function createCompanionService(db: PrismaClient) {
  async function requireTrip(tx: Prisma.TransactionClient, tripId: string) {
    if (!await tx.trip.findUnique({ where: { id: tripId }, select: { id: true } })) {
      throw new TripError(404, 'NOT_FOUND', '找不到旅行。');
    }
  }
  return {
    list: (tripId: string): Promise<List<Companion>> => db.$transaction(async tx => {
      await requireTrip(tx, tripId);
      const items = await tx.companion.findMany({ where: { tripId }, select, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
      return { items, total: items.length };
    }),
    create: (tripId: string, body: unknown): Promise<Companion> => {
      const name = validateCompanionName(body);
      return db.$transaction(async tx => {
        await requireTrip(tx, tripId);
        return tx.companion.create({ data: { tripId, name }, select });
      });
    },
    patch: (tripId: string, companionId: string, body: unknown): Promise<Companion> => {
      const name = validateCompanionName(body);
      return db.$transaction(async tx => {
        await requireTrip(tx, tripId);
        const result = await tx.companion.updateMany({ where: { id: companionId, tripId }, data: { name } });
        if (!result.count) throw new TripError(404, 'NOT_FOUND', '找不到同行人。');
        return tx.companion.findUniqueOrThrow({ where: { id: companionId }, select });
      });
    },
  };
}

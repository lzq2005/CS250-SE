import type { Prisma, PrismaClient } from '@prisma/client';
import type { TripConfig } from '@tripmate/contracts';
import { fields, invalid, object, TripError, validateTrip } from './validation.js';

type Db = Prisma.TransactionClient;
type Row = Prisma.TripGetPayload<{ include: { dayWindows: true } }>;
export function toTripConfig(row: Row): TripConfig {
  return { id: row.id, title: row.title, startDate: row.startDate, endDate: row.endDate,
    origin: { label: row.originLabel, position: { lat: row.originLat, lng: row.originLng }, source: row.originSource as TripConfig['origin']['source'] },
    dayWindows: row.dayWindows.map(({ date, start, end }) => ({ date, start, end })).sort((a, b) => a.date.localeCompare(b.date)),
    interests: row.interests as TripConfig['interests'], budget: row.budgetAmountMinor === null ? null : { amountMinor: Number(row.budgetAmountMinor), currency: row.budgetCurrency as 'MOP' | 'HKD' | 'CNY' }, pace: row.pace as TripConfig['pace'] };
}
// B/C can pass their transaction client; no HTTP self-call or companion loading.
export async function readTrip(db: Db, id: string): Promise<TripConfig> {
  const row = await db.trip.findUnique({ where: { id }, include: { dayWindows: true } });
  if (!row) throw new TripError(404, 'NOT_FOUND', '找不到旅行。');
  return toTripConfig(row);
}
function columns(v: Omit<TripConfig, 'id'>) {
  return { title: v.title, startDate: v.startDate, endDate: v.endDate, originLabel: v.origin.label, originLat: v.origin.position.lat,
    originLng: v.origin.position.lng, originSource: v.origin.source, interests: v.interests,
    budgetAmountMinor: v.budget === null ? null : BigInt(v.budget.amountMinor), budgetCurrency: v.budget?.currency ?? null, pace: v.pace };
}
export function createTripService(db: PrismaClient) {
  return {
    list: () => db.$transaction(async tx => { const rows = await tx.trip.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], include: { dayWindows: true } }); return { items: rows.map(toTripConfig), total: rows.length }; }),
    get: (id: string) => db.$transaction(tx => readTrip(tx, id)),
    create: (body: unknown) => {
      const v = validateTrip(body);
      return db.$transaction(async tx => toTripConfig(await tx.trip.create({ data: { ...columns(v), dayWindows: { create: v.dayWindows } }, include: { dayWindows: true } })));
    },
    patch: (id: string, body: unknown) => {
      const patch = object(body, fields, 'trip');
      if (!Object.keys(patch).length) invalid('trip', '至少修改一个字段');
      return db.$transaction(async tx => {
        const old = await readTrip(tx, id);
        const { id: _id, ...config } = old;
        void _id;
        const v = validateTrip({ ...config, ...patch });
        if ('dayWindows' in patch) await tx.dayWindow.deleteMany({ where: { tripId: id } });
        const row = await tx.trip.update({ where: { id }, data: { ...columns(v), ...('dayWindows' in patch ? { dayWindows: { create: v.dayWindows } } : {}) }, include: { dayWindows: true } });
        return toTripConfig(row);
      });
    },
  };
}

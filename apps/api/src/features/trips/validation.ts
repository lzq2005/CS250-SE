import type { CreateTripRequest, TripConfig } from '@tripmate/contracts';
import { isMacauPoint, originOptions } from './origins.js';

export class TripError extends Error {
  constructor(public status: number, public code: string, message: string, public details: Record<string, unknown> | null = null) { super(message); }
}
export function invalid(path: string, reason: string): never {
  throw new TripError(422, 'VALIDATION_ERROR', '旅行信息无效，请检查输入。', { fields: [{ path, reason }] });
}
export function object(value: unknown, keys: string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(path, '必须为对象');
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) if (!keys.includes(key)) invalid(`${path}.${key}`, '不支持的字段');
  return record;
}
export const fields = ['title', 'startDate', 'endDate', 'origin', 'dayWindows', 'interests', 'budget', 'pace'];
export function localDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const time = (v: unknown): v is string => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v) && Number(v.slice(3)) % 15 === 0;
const nonblank = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
export function validateTrip(value: unknown): Omit<TripConfig, 'id'> {
  const v = object(value, fields, 'trip');
  if (!nonblank(v.title)) invalid('title', '请输入旅行名称');
  if (!localDate(v.startDate)) invalid('startDate', '请输入合法日期 YYYY-MM-DD');
  if (!localDate(v.endDate) || v.endDate < v.startDate) invalid('endDate', '结束日期不得早于开始日期');
  const o = object(v.origin, ['label', 'position', 'source'], 'origin');
  const p = object(o.position, ['lat', 'lng'], 'origin.position');
  if (!nonblank(o.label)) invalid('origin.label', '请输入出发点名称');
  if (o.source !== 'curated' && o.source !== 'manual') invalid('origin.source', '无效来源');
  if (typeof p.lat !== 'number' || typeof p.lng !== 'number' || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || !isMacauPoint(p.lat, p.lng)) invalid('origin.position', '请选择已核实澳门陆地区域内的位置；边界或新填海区域请改选已核实位置');
  // SQLite/Prisma round-trip can change the last few floating point bits.
  if (o.source === 'curated' && !originOptions.some(x => x.label === o.label && Math.abs(x.position.lat - (p.lat as number)) < 1e-7 && Math.abs(x.position.lng - (p.lng as number)) < 1e-7)) invalid('origin', '预置点必须与服务端目录一致');
  if (!Array.isArray(v.dayWindows)) invalid('dayWindows', '每日必须有一个时间窗口');
  const seen = new Set<string>();
  for (const [i, item] of v.dayWindows.entries()) {
    const w = object(item, ['date', 'start', 'end'], `dayWindows.${i}`);
    if (!localDate(w.date) || w.date < v.startDate || w.date > v.endDate || seen.has(w.date)) invalid(`dayWindows.${i}.date`, '日期须在范围内且不能重复');
    seen.add(w.date);
    if (!time(w.start) || !time(w.end) || w.start >= w.end) invalid(`dayWindows.${i}`, '使用同日15分钟粒度 HH:mm，结束须晚于开始');
  }
  const count = (Date.parse(`${v.endDate}T00:00:00Z`) - Date.parse(`${v.startDate}T00:00:00Z`)) / 86400000 + 1;
  if (seen.size !== count) invalid('dayWindows', '日期范围内每天必须恰好有一个窗口');
  if (!Array.isArray(v.interests) || !v.interests.every(x => ['history', 'food', 'shopping', 'nature'].includes(x)) || new Set(v.interests).size !== v.interests.length) invalid('interests', '偏好须为不重复的有效分类');
  if (v.budget !== null) {
    const b = object(v.budget, ['amountMinor', 'currency'], 'budget');
    if (typeof b.amountMinor !== 'number' || !Number.isSafeInteger(b.amountMinor) || b.amountMinor < 0) invalid('budget.amountMinor', '预算须为非负安全整数分');
    if (!['MOP', 'HKD', 'CNY'].includes(b.currency as string)) invalid('budget.currency', '请选择 MOP/HKD/CNY');
  }
  if (v.pace === 'relaxed') throw new TripError(422, 'OPTION_NOT_ENABLED', '舒缓节奏尚未启用。');
  if (v.pace !== undefined && v.pace !== 'standard') invalid('pace', '无效节奏');
  return { ...(v as CreateTripRequest), title: v.title.trim(), pace: 'standard', dayWindows: [...v.dayWindows].sort((a, b) => a.date.localeCompare(b.date)) };
}

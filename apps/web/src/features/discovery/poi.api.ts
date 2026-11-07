import type { Category, List, POI } from '@tripmate/contracts';

type Filters = { search?: string; category?: Category; favoriteOnly?: boolean };
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const optionalText = (value: unknown) => value === null || typeof value === 'string';
const time = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const uuid = (value: unknown) => typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
function isPOI(value: unknown): value is POI {
  if (!object(value)) return false;
  return uuid(value.id) && typeof value.name === 'string' && typeof value.address === 'string'
    && typeof value.category === 'string' && ['history', 'food', 'shopping', 'nature'].includes(value.category)
    && Array.isArray(value.tags) && value.tags.every(tag => typeof tag === 'string')
    && object(value.position) && typeof value.position.lat === 'number' && Number.isFinite(value.position.lat)
    && Math.abs(value.position.lat) <= 90 && typeof value.position.lng === 'number' && Number.isFinite(value.position.lng) && Math.abs(value.position.lng) <= 180
    && (value.openingHours === null || (Array.isArray(value.openingHours) && value.openingHours.every(window => object(window)
      && typeof window.weekday === 'number' && Number.isInteger(window.weekday) && window.weekday >= 1 && window.weekday <= 7
      && time(window.open) && time(window.close) && window.open < window.close
      && (window.lastEntry === null || (time(window.lastEntry) && window.lastEntry >= window.open && window.lastEntry <= window.close)))))
    && (value.price === null || (object(value.price) && typeof value.price.amountMinor === 'number'
      && Number.isSafeInteger(value.price.amountMinor) && value.price.amountMinor >= 0 && typeof value.price.currency === 'string' && ['MOP', 'HKD', 'CNY'].includes(value.price.currency)))
    && (value.suggestedVisitMinutes === null || (typeof value.suggestedVisitMinutes === 'number' && Number.isSafeInteger(value.suggestedVisitMinutes) && value.suggestedVisitMinutes > 0))
    && typeof value.verification === 'string' && ['verified', 'estimated', 'unknown'].includes(value.verification)
    && optionalText(value.sourceUrl) && optionalText(value.bookingNote)
    && (value.checkedAt === null || (typeof value.checkedAt === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value.checkedAt) && Number.isFinite(Date.parse(value.checkedAt))));
}
async function read(path: string, signal?: AbortSignal, missingIsNull = false): Promise<unknown> {
  let response: Response;
  try { response = await fetch(`/api/v1${path}`, { signal, headers: { Accept: 'application/json' } }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('无法连接景点服务，请检查连接后重试。');
  }
  if (response.status === 404) {
    if (missingIsNull) return null;
    throw new Error('景点服务尚未接入，请稍后重试。');
  }
  if (!response.ok) throw new Error(response.status === 503 ? '景点资料暂时不可用，请稍后重试。' : '景点资料加载失败，请重试。');
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error('景点资料格式不正确，请稍后重试。'); }
  if (!object(body) || !('data' in body) || 'error' in body) throw new Error('景点资料格式不正确，请稍后重试。');
  return body.data;
}
export async function listPois(filters: Filters = {}, signal?: AbortSignal): Promise<List<POI>> {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set('search', filters.search.trim());
  if (filters.category) query.set('category', filters.category);
  if (filters.favoriteOnly !== undefined) query.set('favoriteOnly', String(filters.favoriteOnly));
  const result = await read(`/pois${query.size ? `?${query}` : ''}`, signal);
  if (!object(result) || !Array.isArray(result.items) || !result.items.every(isPOI)
    || result.total !== result.items.length) throw new Error('景点资料格式不正确，请稍后重试。');
  return result as List<POI>;
}
export async function getPoi(id: string, signal?: AbortSignal): Promise<POI | null> {
  if (!uuid(id)) return null;
  const result = await read(`/pois/${encodeURIComponent(id)}`, signal, true);
  if (result === null) return null;
  if (!isPOI(result) || result.id !== id) throw new Error('景点资料格式不正确，请稍后重试。');
  return result;
}

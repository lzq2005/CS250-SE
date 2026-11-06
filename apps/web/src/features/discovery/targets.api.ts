import type { TargetsView } from '@tripmate/contracts';

const uuid = (id: unknown): id is string => typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export class TargetsError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(status === 404 ? '旅行或地点暂不可用，请重新验证。' : status === 409 && code === 'DUPLICATE_TARGET' ? '这个地点已经加入当前旅行。' : '目标地点操作未确认，请重新读取后再试。');
  }
}
async function request(tripId: string, method: 'GET' | 'POST' | 'DELETE', poiId?: string, signal?: AbortSignal): Promise<TargetsView> {
  if (!uuid(tripId) || (poiId !== undefined && !uuid(poiId))) throw new Error('旅行或地点编号无效。');
  const response = await fetch(`/api/v1/trips/${tripId}/targets${method === 'DELETE' ? `/${poiId}` : ''}`, {
    method, signal, headers: { Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify({ poiId }) } : {}),
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new TargetsError(response.status, object(body) && object(body.error) && typeof body.error.code === 'string' ? body.error.code : 'UNKNOWN');
  if (response.status !== (method === 'POST' ? 201 : 200) || !object(body) || 'error' in body || !object(body.data)
    || body.data.tripId !== tripId || !Array.isArray(body.data.poiIds) || !body.data.poiIds.every(uuid)
    || new Set(body.data.poiIds).size !== body.data.poiIds.length) throw new Error('目标地点响应格式不正确。');
  const view = body.data as TargetsView;
  if (method === 'POST' && !view.poiIds.includes(poiId!) || method === 'DELETE' && view.poiIds.includes(poiId!)) throw new Error('目标地点响应与操作不一致。');
  return view;
}
export const getTargets = (tripId: string, signal?: AbortSignal) => request(tripId, 'GET', undefined, signal);
export const addTarget = (tripId: string, poiId: string, signal?: AbortSignal) => request(tripId, 'POST', poiId, signal);
export const removeTarget = (tripId: string, poiId: string, signal?: AbortSignal) => request(tripId, 'DELETE', poiId, signal);

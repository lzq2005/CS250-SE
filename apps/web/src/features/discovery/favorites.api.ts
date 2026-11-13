import type { FavoriteState } from '@tripmate/contracts';

const uuid = (id: string) => /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id);
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
async function call(poiId: string, method: 'GET' | 'PUT' | 'DELETE', signal?: AbortSignal): Promise<FavoriteState> {
  if (!uuid(poiId)) throw new Error('地点编号无效。');
  let response: Response;
  try { response = await fetch(`/api/v1/favorites/${poiId}`, {
    method, signal, headers: { Accept: 'application/json', ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'PUT' ? { body: '{}' } : {}),
  }); } catch (cause) { if (signal?.aborted) throw cause; throw new Error('无法连接收藏服务，请重试。'); }
  if (!response.ok) throw new Error(response.status === 404 ? '收藏服务或地点暂不可用，请刷新后重试。' : '收藏操作未确认，请重新读取状态。');
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error('收藏响应格式不正确。'); }
  if (response.status !== 200 || !object(body) || 'error' in body || !object(body.data)
    || body.data.poiId !== poiId || typeof body.data.favorited !== 'boolean') throw new Error('收藏响应格式不正确。');
  const state = body.data as FavoriteState;
  if (method !== 'GET' && state.favorited !== (method === 'PUT')) throw new Error('收藏响应与操作不一致。');
  return state;
}
export const getFavorite = (poiId: string, signal?: AbortSignal) => call(poiId, 'GET', signal);
export const putFavorite = (poiId: string, signal?: AbortSignal) => call(poiId, 'PUT', signal);
export const deleteFavorite = (poiId: string, signal?: AbortSignal) => call(poiId, 'DELETE', signal);

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFavorite, putFavorite, deleteFavorite } from '../../apps/web/src/features/discovery/favorites.api.js';
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const reply = (data: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status })));
afterEach(() => vi.unstubAllGlobals());
describe('Favorite HTTP contract', () => {
  it('uses GET without body, PUT exact {}, DELETE without body', async () => {
    reply({ data: { poiId: id, favorited: false } }); await getFavorite(id);
    expect(fetch).toHaveBeenCalledWith(`/api/v1/favorites/${id}`, expect.objectContaining({ method: 'GET' }));
    expect(vi.mocked(fetch).mock.calls[0]![1]).not.toHaveProperty('body');
    reply({ data: { poiId: id, favorited: true } }); await putFavorite(id);
    expect(fetch).toHaveBeenCalledWith(`/api/v1/favorites/${id}`, expect.objectContaining({ method: 'PUT', body: '{}' }));
    reply({ data: { poiId: id, favorited: false } }); await deleteFavorite(id);
    expect(vi.mocked(fetch).mock.calls[0]![1]).not.toHaveProperty('body');
  });
  it.each([{ data: { poiId: other, favorited: true } }, { data: { poiId: id, favorited: 'true' } }, { data: null }, { data: { poiId: id }, error: {} }])('rejects broken or mismatched state', async body => {
    reply(body); await expect(getFavorite(id)).rejects.toThrow('格式不正确');
  });
  it('rejects wrong successful status and mutation state without pretending success', async () => {
    reply({ data: { poiId: id, favorited: true } }, 201); await expect(putFavorite(id)).rejects.toThrow('格式不正确');
    reply({ data: { poiId: id, favorited: false } }); await expect(putFavorite(id)).rejects.toThrow('不一致');
    reply({ data: { poiId: id, favorited: true } }); await expect(deleteFavorite(id)).rejects.toThrow('不一致');
  });
  it('rejects invalid ID without fetching and sanitizes JSON/network/server failures', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); await expect(getFavorite('bad')).rejects.toThrow('无效'); expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(new Response('PRIVATE raw HTML')); await expect(getFavorite(id)).rejects.toThrow('格式不正确');
    fetcher.mockRejectedValue(new Error('PRIVATE network')); await expect(getFavorite(id)).rejects.toThrow('无法连接');
    reply({ error: { message: 'PRIVATE SQL' } }, 503); await expect(getFavorite(id)).rejects.toThrow('未确认');
    reply({}, 404); await expect(getFavorite(id)).rejects.toThrow('暂不可用');
  });
});

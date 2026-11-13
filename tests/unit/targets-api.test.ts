import { afterEach, describe, expect, it, vi } from 'vitest';
import { addTarget, getTargets, removeTarget, TargetsError } from '../../apps/web/src/features/discovery/targets.api.js';
const tripId = 'c0000000-0000-4000-8000-000000000001';
const poiId = '11111111-1111-4111-8111-111111111111';
const reply = (data: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status })));
afterEach(() => vi.unstubAllGlobals());
describe('Targets contracted HTTP client', () => {
  it('uses the exact GET/POST/DELETE contracts, preserving server order', async () => {
    reply({ data: { tripId, poiIds: [] } }); await expect(getTargets(tripId)).resolves.toEqual({ tripId, poiIds: [] });
    expect(fetch).toHaveBeenCalledWith(`/api/v1/trips/${tripId}/targets`, expect.objectContaining({ method: 'GET' }));
    reply({ data: { tripId, poiIds: [poiId] } }, 201); await addTarget(tripId, poiId);
    expect(fetch).toHaveBeenCalledWith(`/api/v1/trips/${tripId}/targets`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ poiId }) }));
    reply({ data: { tripId, poiIds: [] } }); await removeTarget(tripId, poiId);
    expect(fetch).toHaveBeenCalledWith(`/api/v1/trips/${tripId}/targets/${poiId}`, expect.objectContaining({ method: 'DELETE' }));
    expect(vi.mocked(fetch).mock.calls[0]![1]).not.toHaveProperty('body');
  });
  it.each([
    { data: { tripId: poiId, poiIds: [] } }, { data: { tripId, poiIds: [poiId, poiId] } },
    { data: { tripId, poiIds: ['bad'] } }, { data: { tripId, poiIds: null } }, { data: {}, error: {} },
  ])('rejects mismatched, malformed or duplicated target IDs', async body => {
    reply(body); await expect(getTargets(tripId)).rejects.toThrow('格式不正确');
  });
  it('rejects successful HTTP with an inconsistent mutation result', async () => {
    reply({ data: { tripId, poiIds: [] } }, 201); await expect(addTarget(tripId, poiId)).rejects.toThrow('不一致');
    reply({ data: { tripId, poiIds: [poiId] } }); await expect(removeTarget(tripId, poiId)).rejects.toThrow('不一致');
  });
  it('keeps structured status/code and never trusts error message text', async () => {
    reply({ error: { code: 'DUPLICATE_TARGET', message: 'private SQL detail' } }, 409);
    const error = await addTarget(tripId, poiId).catch(e => e);
    expect(error).toBeInstanceOf(TargetsError); expect(error).toMatchObject({ status: 409, code: 'DUPLICATE_TARGET' });
    expect(error.message).not.toContain('private');
  });
  it('does not fetch invalid IDs or silently substitute empty targets for network errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline')); vi.stubGlobal('fetch', fetcher);
    await expect(addTarget(tripId, 'bad')).rejects.toThrow('无效'); expect(fetcher).not.toHaveBeenCalled();
    await expect(getTargets(tripId)).rejects.toThrow('offline');
  });
});

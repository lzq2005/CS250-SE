import { afterEach, describe, expect, it, vi } from 'vitest';
import { listPois, getPoi } from '../../apps/web/src/features/discovery/poi.api.js';
import fixtures from '../../apps/web/src/features/discovery/browser-tests/pois.synthetic.json' with { type: 'json' };

afterEach(() => vi.unstubAllGlobals());
const reply = (body: unknown, status = 200) => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
describe('B discovery API client (no fallback fixture)', () => {
  it('encodes only contracted query values and sends cancellation signal', async () => {
    reply({ data: { items: fixtures, total: fixtures.length } });
    const signal = new AbortController().signal;
    expect((await listPois({ search: '  A&B  ', category: 'history', favoriteOnly: true }, signal)).total).toBe(8);
    expect(fetch).toHaveBeenCalledWith('/api/v1/pois?search=A%26B&category=history&favoriteOnly=true', { signal, headers: { Accept: 'application/json' } });
  });
  it('preserves unknown versus closed/free and validates a detail identity', async () => {
    reply({ data: fixtures[0] });
    expect(await getPoi(fixtures[0]!.id)).toMatchObject({ openingHours: null, price: null });
    reply({ data: fixtures[1] });
    expect(await getPoi(fixtures[1]!.id)).toMatchObject({ openingHours: [], price: { amountMinor: 0 } });
    await expect(getPoi(fixtures[0]!.id)).rejects.toThrow('格式不正确');
  });
  it('treats unregistered collection as an error and missing detail as null', async () => {
    reply({ error: { code: 'NOT_FOUND', message: 'Missing', details: null } }, 404);
    await expect(listPois()).rejects.toThrow('尚未接入');
    expect(await getPoi(fixtures[0]!.id)).toBeNull();
    expect(await getPoi('invalid-id')).toBeNull();
  });
  it.each([
    { data: { items: [{}], total: 1 } },
    { data: { items: fixtures, total: 1 } },
    { data: { items: [{ ...fixtures[0], price: { amountMinor: -1, currency: 'MOP' } }], total: 1 } },
    { data: { items: [{ ...fixtures[0], openingHours: undefined }], total: 1 } },
    { data: { items: [{ ...fixtures[0], category: ['history'] }], total: 1 } },
  ])('rejects broken response shape instead of displaying unknown as free', async body => {
    reply(body); await expect(listPois()).rejects.toThrow('格式不正确');
  });
  it('reports unavailable storage and network failure without substituting data', async () => {
    reply({}, 503); await expect(listPois()).rejects.toThrow('暂时不可用');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('private connection details')));
    await expect(listPois()).rejects.toThrow('无法连接');
  });
});

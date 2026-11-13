import { describe, expect, it } from 'vitest';
import type { Currency, FxRate, PlannerInput } from '@tripmate/contracts';
import { createReferenceFxAdapter, referenceFx, ReferenceFxDataError } from '../../apps/api/src/features/billing/reference-fx.js';

// Synthetic rates and citations test the boundary; they are NOT Macau FX advice,
// approved references, or data for any application/DB seed.
const synthetic = (patch: Partial<FxRate> = {}): FxRate => ({
  from: 'HKD', to: 'MOP', decimalRate: '1.234567890123456789',
  asOf: null, source: 'Synthetic test-only reference; not approved', ...patch,
});

describe('A-06 read-only reference FX', () => {
  it('returns no production rates until an actual reference is approved', () => {
    expect(referenceFx.readRates()).toEqual([]);
    const currencies: Currency[] = ['MOP', 'HKD', 'CNY'];
    for (const from of currencies) for (const to of currencies) expect(referenceFx.findRate(from, to)).toBeNull();
  });

  it('provides existing PlannerInput.fxRates with exact decimal text and provenance', () => {
    const rates = [synthetic(), synthetic({ from: 'MOP', to: 'CNY', asOf: '2026-11-13T00:00:00.123Z' })];
    const adapter = createReferenceFxAdapter(rates);
    const fxRates: PlannerInput['fxRates'] = adapter.readRates();
    expect(fxRates).toEqual(rates);
    expect(adapter.findRate('HKD', 'MOP')).toEqual(rates[0]);
    expect(fxRates[0]?.asOf).toBeNull(); // Consumer must label this Static reference.
    expect(JSON.parse(JSON.stringify(fxRates))).toEqual(rates);
  });

  it('does not infer inverse, cross, default or same-currency rates', () => {
    const adapter = createReferenceFxAdapter([synthetic(), synthetic({ from: 'MOP', to: 'CNY' })]);
    expect(adapter.findRate('MOP', 'HKD')).toBeNull();
    expect(adapter.findRate('HKD', 'CNY')).toBeNull();
    expect(adapter.findRate('MOP', 'MOP')).toBeNull(); // Same currency needs no FX.
    expect(adapter.findRate('CNY', 'HKD')).toBeNull();
  });

  it('isolates the trusted source and every returned snapshot from mutation', () => {
    const source = [synthetic()];
    const adapter = createReferenceFxAdapter(source);
    source[0]!.decimalRate = '999'; source.length = 0;
    const first = adapter.readRates();
    first[0]!.source = null; first.length = 0;
    const rate = adapter.findRate('HKD', 'MOP')!; rate.decimalRate = '999';
    expect(adapter.readRates()).toEqual([synthetic()]);
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it.each(['2028-02-29T23:59:59Z', '2026-11-13T00:00:00.1Z', '2026-11-13T00:00:00.12Z', '2026-11-13T00:00:00.000Z'])(
    'accepts a valid UTC reference date: %s', asOf => {
      expect(createReferenceFxAdapter([synthetic({ asOf })]).readRates()[0]?.asOf).toBe(asOf);
    },
  );

  const invalidRates: unknown[] = [
    null, undefined, [], '1.2',
    ...['USD', 'mop', '', null, undefined].map(from => ({ ...synthetic(), from })),
    ...['USD', 'hkd', null, undefined, 'HKD'].map(to => ({ ...synthetic(), to })),
    ...[0, 1.2, NaN, Infinity, null, undefined, '', '0', '0.000', '-1', '+1', '.5', '1.', '1e2', 'NaN', 'Infinity', ' 1.2', '1.2 ', '1\n', '1\r\n', '1/2', '1,2'].map(decimalRate => ({ ...synthetic(), decimalRate })),
    ...[null, undefined, '', ' \n ', 123].map(source => ({ ...synthetic(), source })),
    ...[undefined, '', '2026-11-13', '2026-11-13T00:00:00+00:00', '2027-02-29T00:00:00Z', '2026-02-30T00:00:00Z', '0000-01-01T00:00:00Z', '2026-11-13T24:00:00Z', '2026-11-13T00:60:00Z', '2026-11-13T00:00:60Z', '2026-11-13T00:00:00.1234Z', 123].map(asOf => ({ ...synthetic(), asOf })),
    { ...synthetic(), approved: true },
  ];
  it.each(invalidRates)('rejects malformed or unsourced data without publishing a partial list: %j', value => {
    expect(() => createReferenceFxAdapter([synthetic({ from: 'CNY' }), value])).toThrow(ReferenceFxDataError);
  });

  it.each([null, undefined, {}, '[]'])('rejects a missing or malformed dataset: %j', data => {
    expect(() => createReferenceFxAdapter(data)).toThrow(ReferenceFxDataError);
  });

  it('rejects even identical duplicate directions rather than choosing an arbitrary rate', () => {
    expect(() => createReferenceFxAdapter([synthetic(), synthetic()])).toThrow('duplicatePair');
    expect(() => createReferenceFxAdapter([synthetic(), synthetic({ decimalRate: '2' })])).toThrow('duplicatePair');
  });

  it('rejects sparse datasets instead of returning holes as rates', () => {
    expect(() => createReferenceFxAdapter(new Array(1))).toThrow(ReferenceFxDataError);
  });

  it.each<[Currency, Currency]>([
    ['MOP', 'HKD'], ['MOP', 'CNY'], ['HKD', 'MOP'], ['HKD', 'CNY'], ['CNY', 'MOP'], ['CNY', 'HKD'],
  ])('supports an explicitly supplied %s to %s direction', (from, to) => {
    const rate = synthetic({ from, to });
    expect(createReferenceFxAdapter([rate]).findRate(from, to)).toEqual(rate);
  });

  it('accepts small and large positive decimal strings without floating point coercion', () => {
    for (const decimalRate of ['0.0000000000000000000000000001', '99999999999999999999999999999.99', '1', '0.5']) {
      expect(createReferenceFxAdapter([synthetic({ decimalRate })]).readRates()[0]?.decimalRate).toBe(decimalRate);
    }
  });
});

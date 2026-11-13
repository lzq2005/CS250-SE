import type { Currency, FxRate } from '@tripmate/contracts';
import { approvedReferenceFxRates } from './reference-fx-data.js';

export class ReferenceFxDataError extends Error {
  constructor(path: string) {
    super(`Invalid reference FX data at ${path}. No rates may be used from this dataset.`);
    this.name = 'ReferenceFxDataError';
  }
}

const isCurrency = (value: unknown): value is Currency => value === 'MOP' || value === 'HKD' || value === 'CNY';
const nonblank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(value);
  // Date alone accepts invalid calendar dates by rolling them into the next month.
  return Number.isFinite(date.getTime()) && date.toISOString() === value.replace(/(?:\.(\d{1,3}))?Z$/, (_match, fraction: string | undefined) => `.${(fraction ?? '').padEnd(3, '0')}Z`);
}

function parseRates(data: unknown): FxRate[] {
  if (!Array.isArray(data)) throw new ReferenceFxDataError('rates');
  const pairs = new Set<string>();
  // Array.from also visits sparse entries, so holes cannot escape validation.
  return Array.from(data, (value: unknown, index) => {
    const fail = (field: string): never => { throw new ReferenceFxDataError(`rates.${index}.${field}`); };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('rate');
    const rate = value as Record<string, unknown>;
    if (Object.keys(rate).some(key => !['from', 'to', 'decimalRate', 'asOf', 'source'].includes(key))) return fail('fields');
    const { from, to, decimalRate, asOf, source } = rate;
    if (!isCurrency(from)) return fail('from');
    if (!isCurrency(to) || from === to) return fail('to');
    // Validate exact decimal text without Number/parseFloat or binary arithmetic.
    if (typeof decimalRate !== 'string' || decimalRate.trim() !== decimalRate || !/^\d+(?:\.\d+)?$/.test(decimalRate) || !/[1-9]/.test(decimalRate)) return fail('decimalRate');
    if (!nonblank(source)) return fail('source');
    if (asOf !== null && !isTimestamp(asOf)) return fail('asOf');
    const pair = `${from}:${to}`;
    if (pairs.has(pair)) return fail('duplicatePair');
    pairs.add(pair);
    return { from, to, decimalRate, asOf, source };
  });
}

// Backend-only boundary for reviewed static data (or explicitly synthetic tests).
// Validation proves shape, not approval: never pass HTTP/client/provider input here.
export function createReferenceFxAdapter(data: unknown) {
  const snapshot = parseRates(data);
  return Object.freeze({
    // Fresh DTO copies keep candidate snapshots independent of later caller edits.
    readRates: (): FxRate[] => snapshot.map(rate => ({ ...rate })),
    findRate: (from: Currency, to: Currency): FxRate | null => {
      const rate = snapshot.find(rate => rate.from === from && rate.to === to);
      return rate ? { ...rate } : null;
    },
  });
}

// The production path only reads A's reviewed source; no DB, network or writes.
export const referenceFx = createReferenceFxAdapter(approvedReferenceFxRates);

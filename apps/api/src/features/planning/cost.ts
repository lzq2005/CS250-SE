import type { Currency, FxRate, ItineraryDay, Money, PlanWarning, POI, TripConfig } from '@tripmate/contracts';

function convert(amount: Money, currency: Currency, rates: FxRate[]): bigint | null {
  if (!Number.isSafeInteger(amount.amountMinor) || amount.amountMinor < 0) return null;
  const minor = BigInt(amount.amountMinor);
  if (amount.currency === currency) return minor;
  const rate = rates.find(r => r.from === amount.currency && r.to === currency && r.source !== null && r.source.trim() !== '');
  if (!rate || !/^\d+(\.\d+)?$/.test(rate.decimalRate)) return null;
  const [whole, fraction = ''] = rate.decimalRate.split('.');
  const divisor = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole + fraction);
  if (numerator <= 0n) return null;
  return (minor * numerator * 2n + divisor) / (divisor * 2n);
}

/** Sum scheduled visits and legs only; missing values never contribute zero to a complete total. */
export function calculateCost(trip: TripConfig, days: ItineraryDay[], pois: POI[], fxRates: FxRate[]): {
  estimatedTotalCost: Money | null; warnings: PlanWarning[];
} {
  const currency = trip.budget?.currency ?? 'MOP';
  const byId = new Map(pois.map(poi => [poi.id, poi]));
  const warnings: PlanWarning[] = [];
  let total = 0n;
  let complete = true;
  let count = 0;
  function add(value: Money | null, poiId: string, label: string) {
    if (value === null) {
      complete = false;
      warnings.push({ code: 'UNKNOWN_PRICE', poiId, severity: 'warning', message: `${label} cost is unknown.` });
      return;
    }
    const converted = convert(value, currency, fxRates);
    if (converted === null) {
      complete = false;
      warnings.push({ code: value.currency === currency ? 'UNKNOWN_PRICE' : 'UNKNOWN_FX', poiId, severity: 'warning', message: `${label} cost cannot be converted to ${currency}.` });
      return;
    }
    total += converted;
  }
  for (const day of days) {
    for (const stop of day.stops) {
      count++;
      add(byId.get(stop.poiId)?.price ?? null, stop.poiId, 'Admission');
    }
    for (const leg of day.legs) add(leg.estimatedCost, leg.toPoiId, 'Travel');
  }
  if (trip.budget && total > BigInt(trip.budget.amountMinor)) {
    warnings.push({ code: 'BUDGET', poiId: null, severity: 'error', message: 'Known scheduled costs exceed the trip budget.' });
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    complete = false;
    warnings.push({ code: 'UNKNOWN_PRICE', poiId: null, severity: 'warning', message: 'Total cost exceeds the supported safe integer range.' });
  }
  return { estimatedTotalCost: complete && count > 0 ? { amountMinor: Number(total), currency } : null, warnings };
}

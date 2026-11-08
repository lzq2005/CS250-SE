import type { GeoPoint, KnownStatus, Money, TravelMode } from '@tripmate/contracts';

type LocationContext = { fromLabel?: string; toLabel?: string };
type Area = 'peninsula' | 'taipa' | 'coloane';

// These conservative text matches are simulation inputs, not geographic boundaries.
function area(label: string): Area | null {
  if (/路氹|cotai/i.test(label)) return null;
  if (/路環|路环|coloane/i.test(label)) return 'coloane';
  if (/氹仔|凼仔|taipa|(?:澳門|澳门)(?:國際|国际)?(?:機場|机场)|(?:macau|macao)(?: international)? airport/i.test(label)) return 'taipa';
  if (/(?:澳門|澳门)半[島岛]|(?:macau|macao) peninsula/i.test(label)) return 'peninsula';
  return null;
}

function taxiSurchargeMinor(context: LocationContext): number {
  const from = context.fromLabel ?? '';
  const to = context.toLabel ?? '';
  const port = /(?:澳門|澳门)(?:國際|国际)?(?:機場|机场)|(?:macau|macao)(?: international)? airport|(?:氹仔|凼仔).{0,8}(?:碼頭|码头)|taipa.{0,12}(?:ferry|maritime).{0,12}terminal|[橫横]琴口岸|hengqin port|港珠澳(?:大橋|大桥).{0,12}(?:口岸|人工[島岛])|(?:hzmb|hong\s*kong.{0,3}zhuhai.{0,3}maca[ou]).{0,30}(?:port|terminal|artificial island)/i;
  const campus = /澳門大學|澳门大学|university of maca[ou]/i;
  let surcharge = port.test(from) ? 800 : campus.test(from) ? 500 : 0;
  const fromArea = area(from);
  const toArea = area(to);
  if (toArea === 'coloane' && fromArea === 'peninsula') surcharge += 500;
  else if (toArea === 'coloane' && fromArea === 'taipa') surcharge += 200;
  return surcharge;
}

/** Simulated estimates, not live routes, timetables, or metered fares. */
export function estimateTravel(from: GeoPoint, to: GeoPoint, mode: TravelMode, context: LocationContext = {}): {
  durationMinutes: number | null; estimatedCost: Money | null; estimateStatus: KnownStatus;
} {
  const validPoint = (point: GeoPoint) => Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 &&
    Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180;
  // Never emit a fabricated duration or free fare for invalid coordinates.
  if (!validPoint(from) || !validPoint(to) || (mode !== 'walk' && mode !== 'bus' && mode !== 'taxi')) {
    return { durationMinutes: null, estimatedCost: null, estimateStatus: 'unknown' };
  }
  if (from.lat === to.lat && from.lng === to.lng) {
    return { durationMinutes: 0, estimatedCost: { amountMinor: 0, currency: 'MOP' }, estimateStatus: 'estimated' };
  }
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
  if (mode === 'walk') {
    return { durationMinutes: Math.ceil(distanceKm / 4 * 60), estimatedCost: { amountMinor: 0, currency: 'MOP' }, estimateStatus: 'estimated' };
  }
  // Simulation assumptions: 1.3x straight-line distance; 15 km/h plus 8 min
  // for one bus, or 25 km/h plus 5 min for a taxi. No actual route is queried.
  const roadKm = distanceKm * 1.3;
  if (mode === 'bus') {
    return { durationMinutes: Math.ceil(8 + roadKm / 15 * 60), estimatedCost: { amountMinor: 600, currency: 'MOP' }, estimateStatus: 'estimated' };
  }
  const increments = Math.ceil(Math.max(0, roadKm * 1000 - 1600) / 220);
  return { durationMinutes: Math.ceil(5 + roadKm / 25 * 60), estimatedCost: { amountMinor: 2100 + increments * 200 + taxiSurchargeMinor(context), currency: 'MOP' }, estimateStatus: 'estimated' };
}

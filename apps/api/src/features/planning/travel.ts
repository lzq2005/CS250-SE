import type { GeoPoint, KnownStatus, Money, TravelMode } from '@tripmate/contracts';

/** A straight-line heuristic, not a road route or Macau-specific measurement.
 * The 4 km/h assumption is close to the CDC's brisk-walking example of 2.5 mph:
 * https://www.cdc.gov/physical-activity-basics/measuring/index.html
 * No sourced model for public transport or taxi is available in the baseline.
 */
export function estimateTravel(from: GeoPoint, to: GeoPoint, mode: TravelMode): {
  durationMinutes: number | null; estimatedCost: Money | null; estimateStatus: KnownStatus;
} {
  const validPoint = (point: GeoPoint) => Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 &&
    Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180;
  // Never emit a fabricated duration or free fare for invalid coordinates.
  if (mode !== 'walk' || !validPoint(from) || !validPoint(to)) {
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
  return { durationMinutes: Math.ceil(distanceKm / 4 * 60), estimatedCost: { amountMinor: 0, currency: 'MOP' }, estimateStatus: 'estimated' };
}

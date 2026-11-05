import type { GeoPoint, POI } from '@tripmate/contracts';

// These are local, straight-line heuristics, not administrative boundaries or routes.
const GROUP_RADIUS_KM = 1.2;
const MAX_GROUP_DETOUR_KM = 0.35;
const KM_PER_DEGREE_LATITUDE = 111.195;

function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const lat = a.lat - b.lat;
  const lng = (a.lng - b.lng) * Math.cos((a.lat + b.lat) * Math.PI / 360);
  return Math.hypot(lat, lng) * KM_PER_DEGREE_LATITUDE;
}

/** Assign each POI to its nearest deterministic nearby anchor, or start a group. */
export function groupNearbyPois(pois: readonly POI[]): Map<string, string> {
  const groups = new Map<string, string>();
  const anchors: POI[] = [];
  for (const poi of [...pois].sort((a, b) => a.id.localeCompare(b.id))) {
    let closest: POI | undefined;
    let closestDistance = Infinity;
    for (const anchor of anchors) {
      const distance = distanceKm(poi.position, anchor.position);
      if (distance <= GROUP_RADIUS_KM && distance < closestDistance) {
        closest = anchor;
        closestDistance = distance;
      }
    }
    if (!closest) {
      closest = poi;
      anchors.push(poi);
    }
    groups.set(poi.id, closest.id);
  }
  return groups;
}

/** Prefer the current group only when doing so adds at most a small detour. */
export function orderCandidates(
  pois: readonly POI[], current: GeoPoint, groups: ReadonlyMap<string, string>, activeGroup: string | null,
): POI[] {
  const candidates = pois.map(poi => ({ poi, distance: distanceKm(current, poi.position) }));
  candidates.sort((a, b) => a.distance - b.distance || a.poi.id.localeCompare(b.poi.id));
  if (!activeGroup || candidates.length === 0) return candidates.map(candidate => candidate.poi);
  const cutoff = candidates[0]!.distance + MAX_GROUP_DETOUR_KM;
  const nearbyGroup = candidates.filter(candidate => groups.get(candidate.poi.id) === activeGroup && candidate.distance <= cutoff);
  const rest = candidates.filter(candidate => groups.get(candidate.poi.id) !== activeGroup || candidate.distance > cutoff);
  return [...nearbyGroup, ...rest].map(candidate => candidate.poi);
}

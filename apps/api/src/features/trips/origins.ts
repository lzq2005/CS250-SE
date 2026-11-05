import type { OriginOption } from '@tripmate/contracts';
import { macauLand } from './macau-land.js';
// MGTO published map coordinates; retrieved 2026-11-04, not invented geocoding.
// https://www.macaotourism.gov.mo/en/sightseeing/macao-world-heritage/ruins-of-st-pauls
export const originOptions: OriginOption[] = [
  { id: '9488baf5-0189-4bdc-9060-390eb1eca3f1', label: '大三巴牌坊', position: { lat: 22.197486389830942, lng: 113.54086971865576 } },
  { id: 'c4ba9215-93ee-4ab5-ab98-73206f6a42bd', label: '议事亭前地', position: { lat: 22.19359974600576, lng: 113.53978116677166 } },
];
function inRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i]!; const [px, py] = ring[j]!;
    if ((y! > lat) !== (py! > lat) && lng < (px! - x!) * (lat - y!) / (py! - y!) + x!) inside = !inside;
  }
  return inside;
}
export function isMacauPoint(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return macauLand.some(poly => inRing(lat, lng, poly[0]!) && !poly.slice(1).some(hole => inRing(lat, lng, hole)));
}

import { describe, expect, it } from 'vitest';
import type { PlannerInput, POI } from '@tripmate/contracts';
import { generatePlan } from '../../../apps/api/src/features/planning/generate.js';
import { groupNearbyPois, orderCandidates } from '../../../apps/api/src/features/planning/geography.js';

// Synthetic coordinates near Macau; these do not assert real opening hours or routes.
const position = { lat: 22.2, lng: 113.5 };
const date = '2026-11-02'; // Monday
const ids = [1, 2, 3, 4].map(n => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`);

function poi(id: string, lat: number): POI {
  return {
    id, name: id, category: 'history', tags: [], position: { ...position, lat }, address: 'Synthetic',
    openingHours: [{ weekday: 1, open: '09:00', close: '18:00', lastEntry: '17:00' }],
    suggestedVisitMinutes: 15, price: { amountMinor: 0, currency: 'MOP' },
    verification: 'estimated', sourceUrl: null, checkedAt: null, bookingNote: null,
  };
}

function input(pois: POI[]): PlannerInput {
  return {
    trip: {
      id: '10000000-0000-4000-8000-000000000001', title: 'Synthetic', startDate: date, endDate: date,
      origin: { label: 'Synthetic', position, source: 'manual' },
      dayWindows: [{ date, start: '10:00', end: '18:00' }], interests: [], budget: null, pace: 'standard',
    },
    selectedPois: pois, defaultTravelMode: 'walk', fxRates: [],
  };
}

describe('C-02 geographic grouping', () => {
  it('groups nearby anchors deterministically even if input order changes', () => {
    const places = [poi(ids[0]!, 22.2005), poi(ids[1]!, 22.201), poi(ids[2]!, 22.23), poi(ids[3]!, 22.2305)];
    const groups = groupNearbyPois(places);
    expect(groups.get(ids[0]!)).toBe(groups.get(ids[1]!));
    expect(groups.get(ids[2]!)).toBe(groups.get(ids[3]!));
    expect(groups.get(ids[0]!)).not.toBe(groups.get(ids[2]!));
    expect(groupNearbyPois([...places].reverse())).toEqual(groups);
  });

  it('visits two nearby groups without alternating between them', () => {
    const places = [poi(ids[2]!, 22.23), poi(ids[0]!, 22.2005), poi(ids[3]!, 22.2305), poi(ids[1]!, 22.201)];
    const request = input(places);
    const before = structuredClone(request);
    const result = generatePlan(request);
    expect(result.days[0]!.stops.map(stop => stop.poiId)).toEqual(ids);
    expect(result.unscheduled).toEqual([]);
    const byId = new Map(places.map(place => [place.id, place]));
    const pathLength = (order: string[]) => {
      let previous = position.lat;
      return order.reduce((length, id) => {
        const next = byId.get(id)!.position.lat;
        const distance = Math.abs(next - previous);
        previous = next;
        return length + distance;
      }, 0);
    };
    expect(pathLength(result.days[0]!.stops.map(stop => stop.poiId)))
      .toBeLessThan(pathLength(places.map(place => place.id)));
    expect(generatePlan(input([...places].reverse()))).toEqual(result);
    expect(request).toEqual(before);
  });

  it('falls back to another group when the remaining local stop is closed', () => {
    const closed = { ...poi(ids[1]!, 22.201), openingHours: [] };
    const result = generatePlan(input([poi(ids[2]!, 22.23), closed, poi(ids[0]!, 22.2005)]));
    expect(result.days[0]!.stops.map(stop => stop.poiId)).toEqual([ids[0], ids[2]]);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId: ids[1], code: 'CLOSED' })]);
  });

  it('limits the extra distance of preferring a group and breaks ties by ID', () => {
    const local = poi(ids[0]!, 22.202);
    const nearOther = poi(ids[1]!, 22.201);
    const farLocal = poi(ids[2]!, 22.208);
    const tie = poi(ids[3]!, 22.201);
    const groups = new Map([[local.id, 'local'], [nearOther.id, 'other'], [farLocal.id, 'local'], [tie.id, 'other']]);
    expect(orderCandidates([tie, farLocal, nearOther, local], position, groups, 'local').map(p => p.id))
      .toEqual([local.id, nearOther.id, tie.id, farLocal.id]);
    expect(orderCandidates([farLocal, nearOther], position, groups, 'local').map(p => p.id))
      .toEqual([nearOther.id, farLocal.id]);
  });
});

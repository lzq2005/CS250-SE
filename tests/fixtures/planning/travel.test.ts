import { describe, expect, it } from 'vitest';
import type { GeoPoint, PlannerInput, POI, TravelMode } from '@tripmate/contracts';
import { generatePlan } from '../../../apps/api/src/features/planning/index.js';
import { estimateTravel } from '../../../apps/api/src/features/planning/travel.js';

// Synthetic coordinates and hours are not Macau routing or timetable data.
const origin: GeoPoint = { lat: 22.2, lng: 113.5 };
const firstId = '20000000-0000-4000-8000-000000000001';
const secondId = '20000000-0000-4000-8000-000000000002';
const unknown = { durationMinutes: null, estimatedCost: null, estimateStatus: 'unknown' };

function poi(id: string, lat: number): POI {
  return {
    id, name: 'Synthetic POI', category: 'history', tags: [], position: { ...origin, lat }, address: 'Synthetic',
    openingHours: [{ weekday: 1, open: '09:00', close: '18:00', lastEntry: '17:00' }],
    suggestedVisitMinutes: 30, price: { amountMinor: 0, currency: 'MOP' },
    verification: 'estimated', sourceUrl: null, checkedAt: null, bookingNote: null,
  };
}

function input(mode: TravelMode, pois = [poi(firstId, 22.201), poi(secondId, 22.203)]): PlannerInput {
  return {
    trip: {
      id: '10000000-0000-4000-8000-000000000001', title: 'Synthetic trip',
      startDate: '2026-11-09', endDate: '2026-11-09',
      origin: { label: 'Synthetic origin', position: origin, source: 'manual' },
      dayWindows: [{ date: '2026-11-09', start: '10:00', end: '18:00' }],
      interests: [], budget: null, pace: 'standard',
    },
    selectedPois: pois, defaultTravelMode: mode, fxRates: [],
  };
}

function minute(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}

describe('C-04 travel estimates', () => {
  it('returns an estimated zero-fare walking leg for identical valid coordinates', () => {
    expect(estimateTravel(origin, origin, 'walk')).toEqual({
      durationMinutes: 0, estimatedCost: { amountMinor: 0, currency: 'MOP' }, estimateStatus: 'estimated',
    });
  });

  it('uses rounded-up straight-line walking minutes and grows with distance', () => {
    const near = { ...origin, lat: 22.201 };
    const far = { ...origin, lat: 22.21 };
    expect(estimateTravel(origin, near, 'walk')).toEqual({
      durationMinutes: 2, estimatedCost: { amountMinor: 0, currency: 'MOP' }, estimateStatus: 'estimated',
    });
    expect(estimateTravel(origin, far, 'walk').durationMinutes).toBe(17);
    expect(estimateTravel(near, origin, 'walk')).toEqual(estimateTravel(origin, near, 'walk'));
  });

  it.each(['bus', 'taxi'] as const)('does not invent a %s duration or fare', mode => {
    expect(estimateTravel(origin, { ...origin, lat: 22.21 }, mode)).toEqual(unknown);
    expect(estimateTravel(origin, origin, mode)).toEqual(unknown);
  });

  it.each([
    { lat: NaN, lng: 113.5 }, { lat: Infinity, lng: 113.5 },
    { lat: 90.1, lng: 113.5 }, { lat: -90.1, lng: 113.5 },
    { lat: 22.2, lng: 180.1 }, { lat: 22.2, lng: -180.1 },
  ])('does not emit a walking estimate for invalid coordinates %#', invalid => {
    expect(estimateTravel(origin, invalid, 'walk')).toEqual(unknown);
    expect(estimateTravel(invalid, origin, 'walk')).toEqual(unknown);
  });

  it('propagates each walking leg into the visit timeline and cost', () => {
    const request = input('walk');
    const before = structuredClone(request);
    const result = generatePlan(request);
    const day = result.days[0]!;
    expect(day.stops.map(stop => stop.poiId)).toEqual([firstId, secondId]);
    expect(day.legs.map(leg => [leg.fromPoiId, leg.toPoiId])).toEqual([[null, firstId], [firstId, secondId]]);
    for (let i = 0; i < day.legs.length; i++) {
      const leg = day.legs[i]!;
      const stop = day.stops[i]!;
      expect(leg).toMatchObject({ mode: 'walk', estimateStatus: 'estimated', estimatedCost: { amountMinor: 0, currency: 'MOP' } });
      expect(leg.durationMinutes).not.toBeNull();
      const departure = i === 0 ? minute('10:00') : minute(day.stops[i - 1]!.end!);
      expect(minute(stop.arrive!)).toBe(departure + leg.durationMinutes!);
      expect(minute(stop.start!)).toBeGreaterThanOrEqual(minute(stop.arrive!));
    }
    expect(result.estimatedTotalCost).toEqual({ amountMinor: 0, currency: 'MOP' });
    expect(result.status).toBe('feasible');
    expect(request).toEqual(before);
    expect(generatePlan(request)).toEqual(result);
  });

  it.each(['bus', 'taxi'] as const)('preserves %s targets when duration is unavailable', mode => {
    const result = generatePlan(input(mode));
    expect(result.days[0]?.legs).toEqual([]);
    expect(result.days[0]?.stops).toEqual([]);
    expect(result.unscheduled.map(item => item.poiId).sort()).toEqual([firstId, secondId]);
    expect(result.unscheduled.every(item => item.code === 'UNKNOWN_TRAVEL')).toBe(true);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ poiId: firstId, code: 'UNKNOWN_TRAVEL' }),
      expect.objectContaining({ poiId: secondId, code: 'UNKNOWN_TRAVEL' }),
    ]));
    expect(result.estimatedTotalCost).toBeNull();
    expect(result.status).toBe('needs_review');
  });

  it('retains a target with invalid coordinates as unknown rather than producing an invalid time', () => {
    const result = generatePlan(input('walk', [poi(firstId, NaN)]));
    expect(result.days[0]?.stops).toEqual([]);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId: firstId, code: 'UNKNOWN_TRAVEL' })]);
    expect(result.status).toBe('needs_review');
  });
});

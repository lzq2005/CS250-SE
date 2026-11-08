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

  it('simulates one bus ride using an estimated duration and the reference fare', () => {
    expect(estimateTravel(origin, { ...origin, lat: 22.201 }, 'bus')).toEqual({
      durationMinutes: 9, estimatedCost: { amountMinor: 600, currency: 'MOP' }, estimateStatus: 'estimated',
    });
    expect(estimateTravel(origin, origin, 'bus')).toEqual({
      durationMinutes: 0, estimatedCost: { amountMinor: 0, currency: 'MOP' }, estimateStatus: 'estimated',
    });
  });

  it('simulates taxi flag-fall and distance increments', () => {
    expect(estimateTravel(origin, { ...origin, lat: 22.201 }, 'taxi')).toEqual({
      durationMinutes: 6, estimatedCost: { amountMinor: 2100, currency: 'MOP' }, estimateStatus: 'estimated',
    });
    expect(estimateTravel(origin, { ...origin, lat: 22.215 }, 'taxi').estimatedCost)
      .toEqual({ amountMinor: 2700, currency: 'MOP' });
  });

  it.each([
    ['airport pickup', '澳門國際機場', '目的地', 2900],
    ['airport destination is not a pickup', '出發地', '澳門國際機場', 2100],
    ['Taipa ferry pickup', '氹仔客運碼頭', '目的地', 2900],
    ['Hengqin port pickup', '横琴口岸', '目的地', 2900],
    ['bridge port pickup', '港珠澳大橋人工島口岸', '目的地', 2900],
    ['bridge port English pickup', 'Hong Kong-Zhuhai-Macao Bridge Port', 'destination', 2900],
    ['campus pickup', '澳門大學', '目的地', 2600],
    ['peninsula to Coloane', '澳门半岛', '路环', 2600],
    ['Taipa to Coloane', '氹仔', '路環', 2300],
    ['airport and Coloane', '澳門國際機場', '路環', 3100],
    ['reverse direction', '路環', '澳门半岛', 2100],
    ['Cotai is not Coloane', '澳门半岛', '路氹城 Cotai', 2100],
    ['unknown location', '出發地', '目的地', 2100],
  ])('applies simulated surcharge: %s', (_label, fromLabel, toLabel, amountMinor) => {
    const estimate = estimateTravel(origin, { ...origin, lat: 22.201 }, 'taxi', { fromLabel, toLabel });
    expect(estimate.estimatedCost).toEqual({ amountMinor, currency: 'MOP' });
    expect(estimate.estimateStatus).toBe('estimated');
  });

  it.each([
    { lat: NaN, lng: 113.5 }, { lat: Infinity, lng: 113.5 },
    { lat: 90.1, lng: 113.5 }, { lat: -90.1, lng: 113.5 },
    { lat: 22.2, lng: 180.1 }, { lat: 22.2, lng: -180.1 },
  ])('does not emit an estimate for invalid coordinates %#', invalid => {
    for (const mode of ['walk', 'bus', 'taxi'] as const) {
      expect(estimateTravel(origin, invalid, mode)).toEqual(unknown);
      expect(estimateTravel(invalid, origin, mode)).toEqual(unknown);
    }
  });

  it('does not interpret an unsupported transport mode as a taxi', () => {
    expect(estimateTravel(origin, { ...origin, lat: 22.201 }, 'tram' as TravelMode)).toEqual(unknown);
    expect(estimateTravel(origin, origin, 'tram' as TravelMode)).toEqual(unknown);
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

  it.each([['bus', 600], ['taxi', 2100]] as const)('schedules %s with labeled simulated legs', (mode, fare) => {
    const request = input(mode);
    const result = generatePlan(request);
    const day = result.days[0]!;
    expect(day.stops.map(stop => stop.poiId)).toEqual([firstId, secondId]);
    expect(result.unscheduled).toEqual([]);
    expect(day.legs).toHaveLength(2);
    for (let i = 0; i < day.legs.length; i++) {
      const leg = day.legs[i]!;
      const departure = i === 0 ? minute('10:00') : minute(day.stops[i - 1]!.end!);
      expect(leg).toMatchObject({ mode, estimateStatus: 'estimated', estimatedCost: { amountMinor: fare, currency: 'MOP' } });
      expect(minute(day.stops[i]!.arrive!)).toBe(departure + leg.durationMinutes!);
    }
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ poiId: firstId, code: 'UNKNOWN_TRAVEL', message: expect.stringContaining('Simulated') }),
      expect.objectContaining({ poiId: secondId, code: 'UNKNOWN_TRAVEL', message: expect.stringContaining('Simulated') }),
    ]));
    expect(result.estimatedTotalCost).toEqual({ amountMinor: fare * 2, currency: 'MOP' });
    expect(result.status).toBe('needs_review');
    expect(generatePlan(request)).toEqual(result);
  });

  it('uses the previous stop label to simulate taxi pickup and directional surcharges', () => {
    const airport = { ...poi(firstId, 22.201), name: '澳門國際機場', address: '氹仔' };
    const coloane = { ...poi(secondId, 22.203), name: 'Synthetic destination', address: '路環' };
    const request = input('taxi', [airport, coloane]);
    request.trip.origin.label = '澳門半島';
    const result = generatePlan(request);
    expect(result.days[0]!.legs.map(leg => leg.estimatedCost?.amountMinor)).toEqual([2100, 3100]);
    expect(result.estimatedTotalCost).toEqual({ amountMinor: 5200, currency: 'MOP' });
  });

  it('retains a target with invalid coordinates as unknown rather than producing an invalid time', () => {
    const result = generatePlan(input('walk', [poi(firstId, NaN)]));
    expect(result.days[0]?.stops).toEqual([]);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId: firstId, code: 'UNKNOWN_TRAVEL' })]);
    expect(result.status).toBe('needs_review');
  });
});

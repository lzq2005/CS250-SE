import { describe, expect, it } from 'vitest';
import type { PlannerInput, PlanResult, POI, RecalculationInput, TripConfig } from '@tripmate/contracts';
import { generatePlan } from '../../../apps/api/src/features/planning/generate.js';
import { revalidateAndRecalculate } from '../../../apps/api/src/features/planning/recalculate.js';

// Synthetic coordinates and windows: no assertion describes an actual Macau POI.
const position = { lat: 22.2, lng: 113.5 };
const date = '2026-11-02'; // Monday
const trip: TripConfig = {
  id: '10000000-0000-4000-8000-000000000001',
  title: 'Synthetic trip', startDate: date, endDate: date,
  origin: { label: 'Synthetic origin', position, source: 'manual' },
  dayWindows: [{ date, start: '10:00', end: '18:00' }],
  interests: [], budget: null, pace: 'standard',
};

function poi(id: string, overrides: Partial<POI> = {}): POI {
  return {
    id, name: 'Synthetic POI', category: 'history', tags: [], position: { ...position },
    address: 'Synthetic address',
    openingHours: [{ weekday: 1, open: '09:00', close: '18:00', lastEntry: '17:00' }],
    suggestedVisitMinutes: 30, price: { amountMinor: 0, currency: 'MOP' },
    verification: 'verified', sourceUrl: null, checkedAt: null, bookingNote: null,
    ...overrides,
  };
}

const firstId = '20000000-0000-4000-8000-000000000001';
const secondId = '20000000-0000-4000-8000-000000000002';

function plannerInput(pois: POI[] = [poi(firstId), poi(secondId)]): PlannerInput {
  return { trip: structuredClone(trip), selectedPois: pois, defaultTravelMode: 'walk', fxRates: [] };
}

function selectedIds(result: ReturnType<typeof generatePlan>): string[] {
  return [...result.days.flatMap(day => day.stops.map(stop => stop.poiId)), ...result.unscheduled.map(stop => stop.poiId)].sort();
}

function twoStopPlan() {
  const input = plannerInput();
  const result = generatePlan(input);
  const stops = result.days.flatMap(day => day.stops);
  expect(stops).toHaveLength(2);
  return { input, result, stops };
}

function priorLockedPlan(input: PlannerInput, start: string, end: string, arrive: string): PlanResult {
  // Synthetic historical transport is controlled fixture data, not a Macau travel claim.
  return {
    tripId: input.trip.id, status: 'feasible',
    days: [{ date, stops: [{ id: '30000000-0000-4000-8000-000000000001', poiId: firstId, date, arrive, start, end }],
      legs: [{ fromPoiId: null, toPoiId: firstId, mode: 'bus', durationMinutes: 5,
        estimatedCost: { amountMinor: 0, currency: 'MOP' }, estimateStatus: 'estimated' }] }],
    unscheduled: [], warnings: [], estimatedTotalCost: { amountMinor: 0, currency: 'MOP' },
  };
}

describe('generatePlan: shared contract', () => {
  it('is deterministic, preserves the input and covers each selection exactly once', () => {
    const input = plannerInput();
    const before = structuredClone(input);
    const result = generatePlan(input);
    expect(generatePlan(input)).toEqual(result);
    expect(input).toEqual(before);
    expect(selectedIds(result)).toEqual([firstId, secondId]);
    const ids = result.days.flatMap(day => day.stops.map(stop => stop.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('retains closed and unknown-duration selections with their reasons', () => {
    const input = plannerInput([poi(firstId, { openingHours: [] }), poi(secondId, { suggestedVisitMinutes: null })]);
    const result = generatePlan(input);
    expect(selectedIds(result)).toEqual([firstId, secondId]);
    expect(result.unscheduled).toEqual(expect.arrayContaining([
      expect.objectContaining({ poiId: firstId, code: 'CLOSED' }),
      expect.objectContaining({ poiId: secondId, code: 'UNKNOWN_DURATION' }),
    ]));
    expect(result.unscheduled.every(item => item.reason.length > 0)).toBe(true);
    expect(result.status).not.toBe('feasible');
  });

  it('marks an unspecified last entry as unknown even when opening hours are known', () => {
    const input = plannerInput([poi(firstId, { openingHours: [{ weekday: 1, open: '09:00', close: '18:00', lastEntry: null }] })]);
    const result = generatePlan(input);
    expect(selectedIds(result)).toEqual([firstId]);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'UNKNOWN_HOURS', poiId: firstId })]));
    expect(result.status).not.toBe('feasible');
  });

  it('does not treat unknown opening hours as confirmed closure', () => {
    const result = generatePlan(plannerInput([poi(firstId, { openingHours: null })]));
    expect(selectedIds(result)).toEqual([firstId]);
    expect(result.status).not.toBe('feasible');
    expect(result.unscheduled.some(item => item.code === 'CLOSED')).toBe(false);
    expect([...result.warnings, ...result.unscheduled].some(item => item.code === 'UNKNOWN_HOURS')).toBe(true);
  });

  it('retains a POI that cannot be visited before its last entry', () => {
    const input = plannerInput([poi(firstId, {
      openingHours: [{ weekday: 1, open: '09:00', close: '18:00', lastEntry: '09:45' }],
    })]);
    const result = generatePlan(input);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId: firstId, code: 'LAST_ENTRY' })]);
    expect(result.status).toBe('infeasible');
  });

  it('retains a visit that cannot fit into the daily window', () => {
    const input = plannerInput([poi(firstId)]);
    input.trip.dayWindows[0]!.end = '10:15';
    const result = generatePlan(input);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId: firstId, code: 'DAY_END' })]);
    expect(result.status).toBe('infeasible');
  });

  it('reports the day-end conflict when an earlier missed entry precedes a later window that cannot fit', () => {
    const input = plannerInput([poi(firstId, {
      openingHours: [
        { weekday: 1, open: '09:00', close: '10:15', lastEntry: '09:45' },
        { weekday: 1, open: '10:20', close: '18:00', lastEntry: '17:00' },
      ],
    })]);
    input.trip.dayWindows[0]!.end = '10:30';
    const result = generatePlan(input);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId: firstId, code: 'DAY_END' })]);
    expect(result.status).toBe('infeasible');
  });

  it('checks the opening weekday for each day instead of dropping a later feasible visit', () => {
    const input = plannerInput([poi(firstId, {
      openingHours: [{ weekday: 2, open: '09:00', close: '18:00', lastEntry: '17:00' }],
    })]);
    input.trip.endDate = '2026-11-03';
    input.trip.dayWindows.push({ date: '2026-11-03', start: '10:00', end: '18:00' });
    const result = generatePlan(input);
    expect(selectedIds(result)).toEqual([firstId]);
    expect(result.days.find(day => day.date === date)?.stops).toHaveLength(0);
    expect(result.days.find(day => day.date === '2026-11-03')?.stops).toEqual([
      expect.objectContaining({ poiId: firstId, date: '2026-11-03' }),
    ]);
  });

  it.each([1, 2])(
    'retains unknown transport rather than treating the whole trip as closed when only weekday %i is open',
    openWeekday => {
      const input = plannerInput([poi(firstId, {
        openingHours: [{ weekday: openWeekday, open: '09:00', close: '18:00', lastEntry: '17:00' }],
      })]);
      input.trip.endDate = '2026-11-03';
      input.trip.dayWindows.push({ date: '2026-11-03', start: '10:00', end: '18:00' });
      input.defaultTravelMode = 'bus';
      const result = generatePlan(input);
      expect(selectedIds(result)).toEqual([firstId]);
      expect(result.unscheduled).toEqual([
        expect.objectContaining({ poiId: firstId, code: 'UNKNOWN_TRAVEL' }),
      ]);
      expect(result.status).toBe('needs_review');
    },
  );

  it.each([['0001-01-01', 1], ['0099-01-01', 4]] as const)(
    'handles the ISO weekday of early year date %s during generation and recalculation',
    (earlyDate, expectedWeekday) => {
      const input = plannerInput([poi(firstId, {
        openingHours: [{ weekday: expectedWeekday, open: '09:00', close: '18:00', lastEntry: '17:00' }],
      })]);
      input.trip.startDate = earlyDate;
      input.trip.endDate = earlyDate;
      input.trip.dayWindows[0]!.date = earlyDate;
      const result = generatePlan(input);
      expect(result.unscheduled).toEqual([]);
      const stop = result.days[0]?.stops[0];
      expect(stop).toMatchObject({ poiId: firstId, date: earlyDate });
      const edited = revalidateAndRecalculate({
        trip: input.trip, allPois: input.selectedPois, current: result, fxRates: [], timeOverrides: [],
        command: { type: 'setVisitTime', stopId: stop!.id, start: '11:00', end: '11:30' },
      });
      expect(edited.days[0]?.stops[0]).toMatchObject({ poiId: firstId, start: '11:00', end: '11:30' });
      expect(edited.warnings.some(warning => warning.code === 'CLOSED')).toBe(false);
    },
  );

  it('preserves a selection when its transport estimate is unknown', () => {
    const input = plannerInput([poi(firstId)]);
    input.defaultTravelMode = 'bus';
    const result = generatePlan(input);
    expect(selectedIds(result)).toEqual([firstId]);
    expect(result.status).not.toBe('feasible');
    expect([...result.warnings, ...result.unscheduled].some(item => item.code === 'UNKNOWN_TRAVEL')).toBe(true);
    for (const leg of result.days.flatMap(day => day.legs)) {
      expect(leg.durationMinutes).toBeNull();
      expect(leg.estimateStatus).toBe('unknown');
    }
  });

  it('does not present a missing exchange rate as a complete total', () => {
    const result = generatePlan(plannerInput([poi(firstId, { price: { amountMinor: 100, currency: 'HKD' } })]));
    expect(result.estimatedTotalCost).toBeNull();
    expect(result.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'UNKNOWN_FX' })]));
    expect(result.status).not.toBe('feasible');
  });

  it('reports a known budget excess even if another price is unknown', () => {
    const input = plannerInput([
      poi(firstId, { price: null }),
      poi(secondId, { price: { amountMinor: 200, currency: 'MOP' } }),
    ]);
    input.trip.budget = { amountMinor: 100, currency: 'MOP' };
    const result = generatePlan(input);
    expect(result.estimatedTotalCost).toBeNull();
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'UNKNOWN_PRICE' }),
      expect.objectContaining({ code: 'BUDGET', severity: 'error' }),
    ]));
    expect(result.status).toBe('infeasible');
  });
});

describe('revalidateAndRecalculate: editing', () => {
  it('reports actual-arrival entry and closing conflicts as well as an overlap with the locked request', () => {
    const input = plannerInput([poi(firstId, {
      position: { lat: position.lat + 0.03, lng: position.lng },
      suggestedVisitMinutes: 45,
      openingHours: [{ weekday: 1, open: '09:00', close: '11:00', lastEntry: '10:15' }],
    })]);
    const current = priorLockedPlan(input, '10:15', '11:00', '10:05');
    const stopId = current.days[0]!.stops[0]!.id;
    const result = revalidateAndRecalculate({
      trip: input.trip, allPois: input.selectedPois, current, fxRates: [],
      timeOverrides: [{ stopId, start: '10:15', end: '11:00' }],
      command: { type: 'setTransportMode', date, toPoiId: firstId, mode: 'walk' },
    });
    expect(result.days[0]?.stops[0]).toMatchObject({ id: stopId, start: '10:15', end: '11:00' });
    expect(result.status).toBe('infeasible');
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'OVERLAP', poiId: firstId, severity: 'error' }),
      expect.objectContaining({ code: 'LAST_ENTRY', poiId: firstId, severity: 'error' }),
      expect.objectContaining({ code: 'CLOSED', poiId: firstId, severity: 'error' }),
    ]));
  });

  it('identifies the next-day earliest departure of a late-arriving final locked stop', () => {
    const input = plannerInput([poi(firstId, {
      position: { lat: position.lat + 0.03, lng: position.lng },
      suggestedVisitMinutes: 15,
      openingHours: [{ weekday: 1, open: '22:00', close: '23:59', lastEntry: '23:59' }],
    })]);
    input.trip.dayWindows[0] = { date, start: '23:00', end: '23:59' };
    const current = priorLockedPlan(input, '23:30', '23:45', '23:05');
    const stopId = current.days[0]!.stops[0]!.id;
    const result = revalidateAndRecalculate({
      trip: input.trip, allPois: input.selectedPois, current, fxRates: [],
      timeOverrides: [{ stopId, start: '23:30', end: '23:45' }],
      command: { type: 'setTransportMode', date, toPoiId: firstId, mode: 'walk' },
    });
    const travelMinutes = result.days[0]!.legs[0]!.durationMinutes!;
    const departure = Math.max(23 * 60 + travelMinutes, 23 * 60 + 30) + 15;
    expect(departure).toBeGreaterThanOrEqual(24 * 60);
    const nextClock = `${String(Math.floor((departure % 1440) / 60)).padStart(2, '0')}:${String(departure % 60).padStart(2, '0')}`;
    const midnightWarning = result.warnings.find(warning => warning.code === 'DAY_END' && warning.message.includes('2026-11-03'));
    expect(midnightWarning).toMatchObject({ poiId: firstId, severity: 'error' });
    expect(midnightWarning?.message).toContain(date);
    expect(midnightWarning?.message).toContain(nextClock);
    expect(result.days[0]?.stops[0]).toMatchObject({ start: '23:30', end: '23:45' });
    expect(result.status).toBe('infeasible');
  });

  it('retains unknown-last-entry warning when a transport edit makes automatic times unknown', () => {
    const input = plannerInput([poi(firstId, {
      openingHours: [{ weekday: 1, open: '09:00', close: '18:00', lastEntry: null }],
    })]);
    const current = generatePlan(input);
    const result = revalidateAndRecalculate({
      trip: input.trip, allPois: input.selectedPois, current, fxRates: [], timeOverrides: [],
      command: { type: 'setTransportMode', date, toPoiId: firstId, mode: 'bus' },
    });
    expect(result.days[0]?.stops[0]).toMatchObject({ arrive: null, start: null, end: null });
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'UNKNOWN_HOURS', poiId: firstId }),
      expect.objectContaining({ code: 'UNKNOWN_TRAVEL', poiId: firstId }),
    ]));
    expect(result.status).toBe('needs_review');
  });

  it('keeps a stop as a diagnostic with null times when changed transport arrives after midnight', () => {
    // A prior feasible synthetic plan has a known one-minute bus leg. Changing
    // mode forces a new estimate over synthetic coordinates, not real Macau travel data.
    const input = plannerInput([poi(firstId, {
      position: { lat: position.lat + 0.05, lng: position.lng },
      suggestedVisitMinutes: 2,
      openingHours: [{ weekday: 1, open: '23:00', close: '23:59', lastEntry: '23:59' }],
    })]);
    input.trip.dayWindows[0] = { date, start: '23:45', end: '23:59' };
    const stopId = '30000000-0000-4000-8000-000000000001';
    const current: PlanResult = {
      tripId: input.trip.id, status: 'feasible',
      days: [{ date, stops: [{ id: stopId, poiId: firstId, date, arrive: '23:46', start: '23:46', end: '23:48' }],
        legs: [{ fromPoiId: null, toPoiId: firstId, mode: 'bus', durationMinutes: 1,
          estimatedCost: { amountMinor: 0, currency: 'MOP' }, estimateStatus: 'estimated' }] }],
      unscheduled: [], warnings: [], estimatedTotalCost: { amountMinor: 0, currency: 'MOP' },
    };
    const result = revalidateAndRecalculate({
      trip: input.trip, allPois: input.selectedPois, current, fxRates: [], timeOverrides: [],
      command: { type: 'setTransportMode', date, toPoiId: firstId, mode: 'walk' },
    });
    expect(result.days[0]?.stops).toEqual([
      expect.objectContaining({ id: stopId, poiId: firstId, date, arrive: null, start: null, end: null }),
    ]);
    expect(result.unscheduled).toEqual([]);
    expect(result.status).toBe('infeasible');
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DAY_END', poiId: firstId, severity: 'error', message: expect.stringContaining('2026-11-03') }),
    ]));
  });

  it('keeps a user time lock while unknown transport propagates and restores known times', () => {
    const { input, result, stops } = twoStopPlan();
    const first = stops[0]!;
    const second = stops[1]!;
    const request: RecalculationInput = {
      trip: input.trip, allPois: input.selectedPois, current: result, fxRates: [], timeOverrides: [],
      command: { type: 'setVisitTime', stopId: first.id, start: '11:00', end: '11:30' },
    };
    const before = structuredClone(request);
    const locked = revalidateAndRecalculate(request);
    expect(request).toEqual(before);
    const overrides = [{ stopId: first.id, start: '11:00', end: '11:30' }];
    const unknown = revalidateAndRecalculate({
      ...request, current: locked, timeOverrides: overrides,
      command: { type: 'setTransportMode', date, toPoiId: first.poiId, mode: 'bus' },
    });
    const uncertainFirst = unknown.days.flatMap(day => day.stops).find(stop => stop.id === first.id)!;
    const uncertainSecond = unknown.days.flatMap(day => day.stops).find(stop => stop.id === second.id)!;
    expect(uncertainFirst).toMatchObject({ arrive: null, start: '11:00', end: '11:30' });
    expect(uncertainSecond).toMatchObject({ arrive: null, start: null, end: null });
    expect(unknown.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'UNKNOWN_TRAVEL' })]));
    expect(unknown.status).toBe('needs_review');
    expect(selectedIds(unknown)).toEqual([firstId, secondId]);

    const restored = revalidateAndRecalculate({
      ...request, current: unknown, timeOverrides: overrides,
      command: { type: 'setTransportMode', date, toPoiId: first.poiId, mode: 'walk' },
    });
    const restoredStops = restored.days.flatMap(day => day.stops);
    expect(restoredStops.find(stop => stop.id === first.id)).toMatchObject({ start: '11:00', end: '11:30' });
    expect(restoredStops.find(stop => stop.id === first.id)?.arrive).not.toBeNull();
    expect(restoredStops.find(stop => stop.id === second.id)?.arrive).not.toBeNull();
    expect(restored.warnings.some(warning => warning.code === 'UNKNOWN_TRAVEL')).toBe(false);
  });

  it('moves a removed stop to unscheduled and rebuilds the next inbound leg', () => {
    const { input, result, stops } = twoStopPlan();
    const first = stops[0]!;
    const second = stops[1]!;
    const request: RecalculationInput = {
      trip: input.trip, allPois: input.selectedPois, current: result, fxRates: [], timeOverrides: [],
      command: { type: 'removeStop', stopId: first.id, confirmed: true },
    };
    const before = structuredClone(request);
    const edited = revalidateAndRecalculate(request);
    expect(request).toEqual(before);
    expect(selectedIds(edited)).toEqual([firstId, secondId]);
    expect(edited.unscheduled).toEqual(expect.arrayContaining([
      expect.objectContaining({ poiId: first.poiId, reason: 'USER_REMOVED', code: 'UNSCHEDULED' }),
    ]));
    expect(edited.days.flatMap(day => day.stops).map(stop => stop.id)).toEqual([second.id]);
    expect(edited.days.flatMap(day => day.legs)).toEqual([
      expect.objectContaining({ fromPoiId: null, toPoiId: second.poiId, mode: 'walk' }),
    ]);
  });

  it('retains an impossible requested lock as an explicit conflict', () => {
    const { input, result, stops } = twoStopPlan();
    const first = stops[0]!;
    const edited = revalidateAndRecalculate({
      trip: input.trip, allPois: input.selectedPois, current: result, fxRates: [], timeOverrides: [],
      command: { type: 'setVisitTime', stopId: first.id, start: '09:00', end: '09:30' },
    });
    const stop = edited.days.flatMap(day => day.stops).find(item => item.id === first.id);
    expect(stop).toMatchObject({ start: '09:00', end: '09:30' });
    expect(edited.status).toBe('infeasible');
    expect(edited.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ poiId: first.poiId, code: 'OVERLAP', severity: 'error' }),
    ]));
    const following = edited.days.flatMap(day => day.stops).find(item => item.id === stops[1]!.id);
    const incoming = edited.days.flatMap(day => day.legs).find(leg => leg.toPoiId === stops[1]!.poiId);
    expect(stop?.arrive).not.toBeNull();
    expect(following?.arrive).not.toBeNull();
    expect(incoming?.durationMinutes).not.toBeNull();
    const asMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const earliestDeparture = Math.max(asMinutes(stop!.arrive!), 9 * 60) + 30;
    expect(asMinutes(following!.arrive!)).toBeGreaterThanOrEqual(earliestDeparture + incoming!.durationMinutes!);
    expect(selectedIds(edited)).toEqual([firstId, secondId]);
  });

  it('rejects a non-quarter-hour edit without mutating its input', () => {
    const { input, result, stops } = twoStopPlan();
    const request: RecalculationInput = {
      trip: input.trip, allPois: input.selectedPois, current: result, fxRates: [], timeOverrides: [],
      command: { type: 'setVisitTime', stopId: stops[0]!.id, start: '11:02', end: '11:30' },
    };
    const before = structuredClone(request);
    expect(() => revalidateAndRecalculate(request)).toThrow();
    expect(request).toEqual(before);
  });
});

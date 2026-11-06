import { describe, expect, it } from 'vitest';
import type { PlannerInput, POI, TripConfig } from '@tripmate/contracts';
import { generatePlan } from '../../../apps/api/src/features/planning/generate.js';

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

  it('reports a known missed last entry even when the transport duration is unknown', () => {
    const input = plannerInput([poi(firstId, {
      openingHours: [{ weekday: 1, open: '09:00', close: '10:00', lastEntry: '09:30' }],
    })]);
    input.defaultTravelMode = 'bus';
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
    'handles the ISO weekday of early year date %s during generation',
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

  it('keeps free walking at zero without requiring an exchange rate', () => {
    const input = plannerInput([poi(firstId, { price: { amountMinor: 100, currency: 'HKD' } })]);
    input.trip.budget = { amountMinor: 500, currency: 'HKD' };
    const result = generatePlan(input);
    expect(result.estimatedTotalCost).toEqual({ amountMinor: 100, currency: 'HKD' });
    expect(result.warnings.some(warning => warning.code === 'UNKNOWN_FX')).toBe(false);
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

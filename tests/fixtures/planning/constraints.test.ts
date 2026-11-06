import { describe, expect, it } from 'vitest';
import type { PlannerInput, POI, WeeklyWindow } from '@tripmate/contracts';
import { generatePlan } from '../../../apps/api/src/features/planning/index.js';

// Synthetic locations and opening windows, not claims about real Macau attractions.
const poiId = '20000000-0000-4000-8000-000000000001';
const monday = '2026-11-02';
const position = { lat: 22.2, lng: 113.5 };
const window = (open: string, close: string, lastEntry: string | null): WeeklyWindow =>
  ({ weekday: 1, open, close, lastEntry });

function input(hours: WeeklyWindow[] | null, duration: number | null = 30): PlannerInput {
  const poi: POI = {
    id: poiId, name: 'Synthetic POI', category: 'history', tags: [], position, address: 'Synthetic',
    openingHours: hours, suggestedVisitMinutes: duration, price: { amountMinor: 0, currency: 'MOP' },
    verification: 'estimated', sourceUrl: null, checkedAt: null, bookingNote: null,
  };
  return {
    trip: {
      id: '10000000-0000-4000-8000-000000000001', title: 'Synthetic', startDate: monday, endDate: monday,
      origin: { label: 'Synthetic', position, source: 'manual' },
      dayWindows: [{ date: monday, start: '10:00', end: '18:00' }], interests: [], budget: null, pace: 'standard',
    },
    selectedPois: [poi], defaultTravelMode: 'walk', fxRates: [],
  };
}

describe('C-03 visit and time-window constraints', () => {
  it('waits for a known opening time and keeps arrival separate from visit start', () => {
    const result = generatePlan(input([window('10:30', '12:00', '11:00')]));
    expect(result.days[0]?.stops).toEqual([expect.objectContaining({ poiId, arrive: '10:00', start: '10:30', end: '11:00' })]);
    expect(result.status).toBe('feasible');
  });

  it('uses a later opening window if the earlier one cannot admit the visit', () => {
    const result = generatePlan(input([window('11:00', '12:00', '11:30'), window('09:00', '10:30', '09:45')]));
    expect(result.days[0]?.stops).toEqual([expect.objectContaining({ poiId, start: '11:00', end: '11:30' })]);
    expect(result.unscheduled).toEqual([]);
  });

  it.each([
    ['last entry', window('09:00', '11:00', '10:00'), '18:00'],
    ['closing', window('09:00', '10:30', '10:00'), '18:00'],
    ['day end', window('09:00', '11:00', '10:00'), '10:30'],
  ])('accepts a visit exactly at the %s boundary', (_label, hours, dayEnd) => {
    const request = input([hours]);
    request.trip.dayWindows[0]!.end = dayEnd;
    const result = generatePlan(request);
    expect(result.days[0]?.stops).toEqual([expect.objectContaining({ poiId, start: '10:00', end: '10:30' })]);
    expect(result.status).toBe('feasible');
  });

  it.each([
    ['known closed day', [], 30, '18:00', 'CLOSED'],
    ['last entry passed', [window('09:00', '11:00', '09:59')], 30, '18:00', 'LAST_ENTRY'],
    ['visit exceeds closing', [window('09:00', '10:29', '10:00')], 30, '18:00', 'CLOSED'],
    ['visit exceeds day end', [window('09:00', '11:00', '10:00')], 30, '10:29', 'DAY_END'],
    ['visit duration unknown', [window('09:00', '11:00', '10:00')], null, '18:00', 'UNKNOWN_DURATION'],
  ] as const)('retains %s as unscheduled with its reason', (_label, hours, duration, dayEnd, code) => {
    const request = input([...hours], duration);
    request.trip.dayWindows[0]!.end = dayEnd;
    const result = generatePlan(request);
    expect(result.days[0]?.stops).toEqual([]);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId, code, reason: expect.any(String) })]);
    expect(result.status).not.toBe('feasible');
  });

  it('keeps a known open-day time conflict when a later day is closed', () => {
    const request = input([window('09:00', '18:00', '17:00')]);
    request.trip.dayWindows[0]!.end = '10:15';
    request.trip.endDate = '2026-11-03';
    request.trip.dayWindows.push({ date: '2026-11-03', start: '10:00', end: '18:00' });
    const result = generatePlan(request);
    expect(result.unscheduled).toEqual([expect.objectContaining({ poiId, code: 'DAY_END' })]);
    expect(result.status).toBe('infeasible');
  });

  it('treats unknown last entry as uncertainty rather than a guarantee', () => {
    const result = generatePlan(input([window('09:00', '18:00', null)]));
    expect(result.days[0]?.stops).toHaveLength(1);
    expect(result.warnings).toContainEqual(expect.objectContaining({ poiId, code: 'UNKNOWN_HOURS' }));
    expect(result.status).toBe('needs_review');
  });
});

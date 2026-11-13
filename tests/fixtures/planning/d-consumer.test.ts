import { describe, expect, it } from 'vitest';
import type { EditCommand, PlannerInput, SavedItinerary } from '@tripmate/contracts';
import { generatePlan, plannerService, revalidateAndRecalculate } from '../../../apps/api/src/features/planning/index.js';

describe('D consumer of the planner entry point', () => {
  it('uses a saved snapshot for consecutive edits without mutating the saved input', () => {
    const date = '2026-11-02';
    const id = '20000000-0000-4000-8000-000000000001';
    const position = { lat: 22.2, lng: 113.5 };
    const input: PlannerInput = {
      trip: {
        id: '10000000-0000-4000-8000-000000000001', title: 'Synthetic',
        startDate: date, endDate: date, origin: { label: 'Origin', position, source: 'manual' },
        dayWindows: [{ date, start: '10:00', end: '18:00' }],
        interests: [], budget: null, pace: 'standard',
      },
      selectedPois: [{
        id, name: 'Synthetic POI', category: 'history', tags: [], position,
        address: 'Synthetic', openingHours: [{ weekday: 1, open: '09:00', close: '18:00', lastEntry: '17:00' }],
        suggestedVisitMinutes: 30, price: { amountMinor: 0, currency: 'MOP' },
        verification: 'verified', sourceUrl: null, checkedAt: null, bookingNote: null,
      }],
      defaultTravelMode: 'walk', fxRates: [],
    };
    const saved: SavedItinerary = {
      id: '40000000-0000-4000-8000-000000000001', tripId: input.trip.id,
      version: 1, input, result: generatePlan(input), timeOverrides: [], updatedAt: '2026-11-02T00:00:00Z',
    };
    const before = structuredClone(saved);
    const stop = saved.result.days[0]!.stops[0]!;
    const command: EditCommand = { type: 'setVisitTime', stopId: stop.id, start: '11:00', end: '11:30' };
    expect(plannerService.revalidateAndRecalculate).toBe(revalidateAndRecalculate);
    const edited = plannerService.revalidateAndRecalculate({
      trip: saved.input.trip, allPois: saved.input.selectedPois, current: saved.result,
      command, fxRates: saved.input.fxRates, timeOverrides: saved.timeOverrides,
    });
    expect(saved).toEqual(before);
    expect(edited.days[0]!.stops[0]).toMatchObject({ id: stop.id, start: '11:00', end: '11:30' });

    // D persists this override together with the edited result, then supplies it on the next edit.
    const persisted: SavedItinerary = {
      ...saved, version: 2, result: edited, timeOverrides: [{ stopId: stop.id, start: command.start, end: command.end }],
    };
    const changedTransport = revalidateAndRecalculate({
      trip: persisted.input.trip, allPois: persisted.input.selectedPois, current: persisted.result,
      command: { type: 'setTransportMode', date, toPoiId: id, mode: 'bus' },
      fxRates: persisted.input.fxRates, timeOverrides: persisted.timeOverrides,
    });
    expect(changedTransport.days[0]!.stops[0]).toMatchObject({ id: stop.id, arrive: null, start: '11:00', end: '11:30' });
    expect(changedTransport.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'UNKNOWN_TRAVEL' })]));
    expect(persisted.version).toBe(2);
    expect(persisted.result).toEqual(edited);
  });
});

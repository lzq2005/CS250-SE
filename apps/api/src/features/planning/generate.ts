import { createHash } from 'node:crypto';
import type { ItineraryDay, PlannedStop, PlannerInput, PlanResult, PlanWarning, POI, WarningCode } from '@tripmate/contracts';
import { calculateCost } from './cost.js';
import { groupNearbyPois, orderCandidates } from './geography.js';
import { estimateTravel } from './travel.js';

type Unscheduled = PlanResult['unscheduled'][number];
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (time: number) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
function weekday(date: string): number {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const value = new Date(0);
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCFullYear(year, month - 1, day);
  const jsDay = value.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}
function stopId(tripId: string, poiId: string): string {
  const hex = createHash('sha256').update('tripmate-stop\0').update(tripId).update('\0').update(poiId).digest('hex').slice(0, 32).split('');
  hex[12] = '8';
  hex[16] = ((parseInt(hex[16] ?? '0', 16) & 3) | 8).toString(16);
  const id = hex.join('');
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}
type Attempt = { start: number; end: number; unknownHours: boolean } | { code: WarningCode; reason: string };
function visit(poi: POI, date: string, arrive: number, dayEnd: number): Attempt {
  const windows = poi.openingHours?.filter(window => window.weekday === weekday(date)) ?? null;
  if (windows !== null && windows.length === 0) return { code: 'CLOSED', reason: 'Closed on this day.' };
  if (poi.suggestedVisitMinutes === null) return { code: 'UNKNOWN_DURATION', reason: 'Visit duration is unknown.' };
  if (windows === null) {
    const end = arrive + poi.suggestedVisitMinutes;
    return end <= dayEnd && end < 1440 ? { start: arrive, end, unknownHours: true } : { code: 'DAY_END', reason: 'The visit does not fit in the daily time window.' };
  }
  let afterEntry = false;
  let beyondDay = false;
  let outsideOpening = false;
  for (const window of [...windows].sort((a, b) => a.open.localeCompare(b.open))) {
    const start = Math.max(arrive, minutes(window.open));
    const end = start + poi.suggestedVisitMinutes;
    if (window.lastEntry !== null && start > minutes(window.lastEntry)) { afterEntry = true; continue; }
    if (end > minutes(window.close)) { outsideOpening = true; continue; }
    if (end > dayEnd || end >= 1440) { beyondDay = true; continue; }
    return { start, end, unknownHours: window.lastEntry === null };
  }
  if (beyondDay) return { code: 'DAY_END', reason: 'The visit does not fit in the daily time window.' };
  if (outsideOpening) return { code: 'CLOSED', reason: 'The full visit does not fit within an opening window.' };
  if (afterEntry) return { code: 'LAST_ENTRY', reason: 'The last entry time has passed.' };
  return { code: 'CLOSED', reason: 'The full visit does not fit within an opening window.' };
}

/** Generate a candidate from the provided snapshots; never perform I/O or persist data. */
export function generatePlan(input: PlannerInput): PlanResult {
  const { trip, fxRates, defaultTravelMode } = input;
  // Relaxed pace is optional and has not been approved/configured yet.
  if (trip.pace === 'relaxed') throw new Error('OPTION_NOT_ENABLED');
  const remaining = new Map<string, POI>();
  for (const poi of input.selectedPois) if (!remaining.has(poi.id)) remaining.set(poi.id, poi);
  const groups = groupNearbyPois([...remaining.values()]);
  const failures = new Map<string, Unscheduled>();
  // A closed or full day does not prove the whole trip infeasible if another
  // day could not be evaluated because required information was unknown.
  const recordFailure = (item: Unscheduled) => {
    const previous = failures.get(item.poiId);
    if (!previous || item.code.startsWith('UNKNOWN_') || !previous.code.startsWith('UNKNOWN_')) {
      failures.set(item.poiId, item);
    }
  };
  const warnings: PlanWarning[] = [];
  const days: ItineraryDay[] = [];
  const orderedWindows = [...trip.dayWindows].sort((a, b) => a.date.localeCompare(b.date));
  for (const dayWindow of orderedWindows) {
    const day: ItineraryDay = { date: dayWindow.date, stops: [], legs: [] };
    let current = trip.origin.position;
    let lastPoiId: string | null = null;
    let activeGroup: string | null = null;
    let time = minutes(dayWindow.start);
    const dayEnd = minutes(dayWindow.end);
    while (remaining.size > 0) {
      let scheduled = false;
      const candidates = orderCandidates([...remaining.values()], current, groups, activeGroup);
      for (const poi of candidates) {
        if (poi.openingHours !== null && !poi.openingHours.some(window => window.weekday === weekday(dayWindow.date))) {
          recordFailure({ poiId: poi.id, code: 'CLOSED', reason: 'Closed on this day.' });
          continue;
        }
        if (poi.suggestedVisitMinutes === null) {
          recordFailure({ poiId: poi.id, code: 'UNKNOWN_DURATION', reason: 'Visit duration is unknown.' });
          continue;
        }
        const estimate = estimateTravel(current, poi.position, defaultTravelMode);
        if (estimate.durationMinutes === null) {
          // Travel cannot take negative time. If a visit is impossible even
          // from the current departure time, its constraint is already known.
          const earliest = visit(poi, dayWindow.date, time, dayEnd);
          if ('code' in earliest && ['CLOSED', 'LAST_ENTRY', 'DAY_END'].includes(earliest.code)) {
            recordFailure({ poiId: poi.id, ...earliest });
          } else {
            recordFailure({ poiId: poi.id, code: 'UNKNOWN_TRAVEL', reason: 'Travel duration is unknown.' });
          }
          continue;
        }
        const arrive = time + estimate.durationMinutes;
        const attempt = visit(poi, dayWindow.date, arrive, dayEnd);
        if ('code' in attempt) { recordFailure({ poiId: poi.id, ...attempt }); continue; }
        const stop: PlannedStop = { id: stopId(trip.id, poi.id), poiId: poi.id, date: dayWindow.date, arrive: clock(arrive), start: clock(attempt.start), end: clock(attempt.end) };
        day.stops.push(stop);
        day.legs.push({ fromPoiId: lastPoiId, toPoiId: poi.id, mode: defaultTravelMode, ...estimate });
        if (attempt.unknownHours) warnings.push({ code: 'UNKNOWN_HOURS', poiId: poi.id, severity: 'warning', message: 'Opening hours or last-entry information is unknown.' });
        remaining.delete(poi.id);
        failures.delete(poi.id);
        current = poi.position;
        lastPoiId = poi.id;
        activeGroup = groups.get(poi.id) ?? null;
        time = attempt.end;
        scheduled = true;
        break;
      }
      if (!scheduled) break;
    }
    days.push(day);
  }
  const unscheduled = [...remaining.values()].map(poi => failures.get(poi.id) ?? { poiId: poi.id, code: 'UNSCHEDULED' as const, reason: 'No available daily time window.' });
  for (const item of unscheduled) warnings.push({ code: item.code, poiId: item.poiId, message: item.reason, severity: 'warning' });
  if (input.selectedPois.length === 0) warnings.push({ code: 'UNSCHEDULED', poiId: null, message: 'No destinations were selected.', severity: 'warning' });
  const cost = calculateCost(trip, days, input.selectedPois, fxRates);
  warnings.push(...cost.warnings);
  const scheduledCount = days.reduce((count, day) => count + day.stops.length, 0);
  const knownImpossible = unscheduled.some(item => ['CLOSED', 'LAST_ENTRY', 'DAY_END', 'OVERLAP', 'BUDGET'].includes(item.code));
  const status = warnings.some(w => w.severity === 'error') || (scheduledCount === 0 && knownImpossible)
    ? 'infeasible' : warnings.length > 0 || unscheduled.length > 0 ? 'needs_review' : 'feasible';
  return { tripId: trip.id, status, days, unscheduled, warnings, estimatedTotalCost: cost.estimatedTotalCost };
}

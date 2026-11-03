import type {
  ItineraryDay, PlanResult, PlanWarning, POI, RecalculationInput, TimeOverride,
  WarningCode,
} from '@tripmate/contracts';
import { estimateTravel } from './travel.js';
import { calculateCost } from './cost.js';

const minutes = (time: string): number => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid local time');
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
};
const localTime = (value: number | null): string | null => {
  if (value === null || value < 0 || value >= 1440) return null;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
};
const weekday = (date: string): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid local date');
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7)), day = Number(date.slice(8, 10));
  const utc = new Date(0);
  utc.setUTCHours(0, 0, 0, 0);
  utc.setUTCFullYear(year, month - 1, day);
  if (utc.toISOString().slice(0, 10) !== date) throw new Error('Invalid local date');
  return utc.getUTCDay() || 7;
};
const overflow = (date: string, value: number): string => {
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7)), day = Number(date.slice(8, 10));
  const next = new Date(0);
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCFullYear(year, month - 1, day + Math.floor(value / 1440));
  return `${date} 的后续日期 ${next.toISOString().slice(0, 10)} ${localTime(value % 1440)}`;
};

/** Recheck an existing plan after one explicit edit; does not mutate or persist the input. */
export function revalidateAndRecalculate(input: RecalculationInput): PlanResult {
  const { trip, command } = input;
  if (input.current.tripId !== trip.id) throw new Error('Trip does not match current plan');
  const pois = new Map(input.allPois.map(poi => [poi.id, poi]));
  const days: ItineraryDay[] = input.current.days.map(day => ({
    date: day.date, stops: day.stops.map(stop => ({ ...stop })),
    legs: day.legs.map(leg => ({ ...leg })),
  }));
  for (const day of days) {
    if (day.stops.length !== day.legs.length || day.stops.some((stop, index) => day.legs[index]?.toPoiId !== stop.poiId)) {
      throw new Error('Plan must have one ordered incoming leg for each stop');
    }
  }
  const unscheduled = input.current.unscheduled.map(item => ({ ...item }));
  const overrides = new Map<string, TimeOverride>(input.timeOverrides.map(item => [item.stopId, { ...item }]));
  if (overrides.size !== input.timeOverrides.length) throw new Error('Duplicate time override');
  if (command.type === 'setTransportMode' && !['walk', 'bus', 'taxi'].includes(command.mode)) throw new Error('Invalid transport mode');
  let matched = false;
  let removedPoiId: string | null = null;
  for (const day of days) {
    if (command.type === 'setTransportMode' && day.date === command.date) {
      const stop = day.stops.find(item => item.poiId === command.toPoiId);
      const leg = day.legs.find(item => item.toPoiId === command.toPoiId);
      if (stop && leg) { leg.mode = command.mode; matched = true; }
    }
    if (command.type === 'setVisitTime') {
      const stop = day.stops.find(item => item.id === command.stopId);
      if (stop) {
        const start = minutes(command.start);
        const end = minutes(command.end);
        if (start >= end || start % 15 !== 0 || end % 15 !== 0) throw new Error('Invalid visit time');
        overrides.set(stop.id, { stopId: stop.id, start: command.start, end: command.end });
        matched = true;
      }
    }
    if (command.type === 'removeStop') {
      const index = day.stops.findIndex(item => item.id === command.stopId);
      if (index >= 0) {
        if (command.confirmed !== true) throw new Error('Stop removal must be confirmed');
        const removed = day.stops[index]!;
        day.stops.splice(index, 1);
        removedPoiId = removed.poiId;
        day.legs = day.legs.filter(leg => leg.toPoiId !== removed.poiId);
        overrides.delete(removed.id);
        unscheduled.push({ poiId: removed.poiId, reason: 'USER_REMOVED', code: 'UNSCHEDULED' });
        matched = true;
      }
    }
  }
  if (!matched) throw new Error('Edit refers to a missing stop or leg');
  const stopIds = new Set(days.flatMap(day => day.stops.map(stop => stop.id)));
  if ([...overrides.keys()].some(id => !stopIds.has(id))) throw new Error('Time override refers to a missing stop');

  const unscheduledIds = new Set(unscheduled.map(item => item.poiId));
  const warnings: PlanWarning[] = input.current.warnings
    .filter(warning => warning.poiId !== null && warning.poiId !== removedPoiId && unscheduledIds.has(warning.poiId))
    .map(warning => ({ ...warning }));
  const warn = (code: WarningCode, poiId: string, message: string, severity: PlanWarning['severity']) => {
    if (!warnings.some(item => item.code === code && item.poiId === poiId && item.message === message)) {
      warnings.push({ code, poiId, message, severity });
    }
  };

  for (const day of days) {
    const dayWindow = trip.dayWindows.find(window => window.date === day.date);
    if (!dayWindow) throw new Error('Missing day window');
    const begin = minutes(dayWindow.start), finish = minutes(dayWindow.end);
    let departure: number | null = begin;
    let previous: POI | undefined;
    const existingLegs = new Map(day.legs.map(leg => [leg.toPoiId, leg]));
    const newLegs: ItineraryDay['legs'] = [];
    for (const stop of day.stops) {
      const poi = pois.get(stop.poiId);
      const leg = existingLegs.get(stop.poiId);
      if (!poi || !leg || stop.date !== day.date) throw new Error('Plan stop or incoming leg is invalid');
      const estimate = estimateTravel(previous?.position ?? trip.origin.position, poi.position, leg.mode);
      newLegs.push({ fromPoiId: previous?.id ?? null, toPoiId: poi.id, mode: leg.mode, ...estimate });
      const arrive: number | null = departure === null || estimate.durationMinutes === null ? null : departure + estimate.durationMinutes;
      if (estimate.durationMinutes === null) warn('UNKNOWN_TRAVEL', poi.id, 'Travel duration is unknown.', 'warning');
      if (arrive !== null && arrive >= 1440) {
        warn('DAY_END', poi.id, `Arrival crosses midnight: ${overflow(day.date, arrive)}.`, 'error');
      }
      stop.arrive = localTime(arrive);
      const lock = overrides.get(stop.id);
      const requestedStart = lock ? minutes(lock.start) : null;
      const requestedEnd = lock ? minutes(lock.end) : null;
      if (lock && (requestedStart === null || requestedEnd === null || requestedStart >= requestedEnd || requestedStart % 15 || requestedEnd % 15)) {
        throw new Error('Invalid time override');
      }
      const duration = lock ? requestedEnd! - requestedStart! : poi.suggestedVisitMinutes;
      if (duration === null) warn('UNKNOWN_DURATION', poi.id, 'Visit duration is unknown.', 'warning');
      const windows = poi.openingHours?.filter(window => window.weekday === weekday(day.date)).map(window => ({
        open: minutes(window.open), close: minutes(window.close),
        lastEntry: window.lastEntry === null ? null : minutes(window.lastEntry),
      })).sort((a, b) => a.open - b.open);
      if (poi.openingHours === null) warn('UNKNOWN_HOURS', poi.id, 'Opening hours are unknown.', 'warning');
      else if (windows?.length === 0) warn('CLOSED', poi.id, 'POI is closed on this day.', 'error');

      let start: number | null = requestedStart;
      if (!lock && arrive !== null) {
        start = arrive;
        if (windows?.length && duration !== null) {
          const suitable = windows.find(window => {
            const candidate = Math.max(arrive!, window.open);
            return candidate + duration <= window.close && (window.lastEntry === null || candidate <= window.lastEntry);
          });
          if (suitable) start = Math.max(arrive, suitable.open);
          else if (arrive < windows[0]!.open) start = windows[0]!.open;
        }
      }
      const end: number | null = lock ? requestedEnd : start !== null && duration !== null ? start + duration : null;
      if ((start === null || end === null) && windows?.some(window => window.lastEntry === null)) {
        warn('UNKNOWN_HOURS', poi.id, 'Last entry is unknown.', 'warning');
      }
      if (lock && arrive !== null && arrive > requestedStart!) {
        warn('OVERLAP', poi.id, `Requested ${lock.start}–${lock.end}; earliest arrival ${localTime(arrive) ?? overflow(day.date, arrive)}.`, 'error');
        if (windows?.length && duration !== null) {
          const reachableStart = Math.max(arrive, requestedStart!);
          const reachableEnd = reachableStart + duration;
          if (!windows.some(window => reachableStart >= window.open && reachableEnd <= window.close)) {
            warn('CLOSED', poi.id, 'Earliest reachable visit is outside opening hours.', 'error');
          }
          const reachableWindow = windows.find(window => reachableStart >= window.open && reachableStart <= window.close);
          if (reachableWindow?.lastEntry === null) {
            warn('UNKNOWN_HOURS', poi.id, 'Last entry is unknown.', 'warning');
          } else if (reachableWindow?.lastEntry !== undefined && reachableStart > reachableWindow.lastEntry) {
            warn('LAST_ENTRY', poi.id, 'Earliest reachable arrival is after last entry.', 'error');
          } else if (!reachableWindow && windows.every(window => window.lastEntry !== null && reachableStart > window.lastEntry)) {
            warn('LAST_ENTRY', poi.id, 'Earliest reachable arrival is after all last-entry times.', 'error');
          }
        }
      }
      if ((start !== null && start < begin) || (end !== null && end > finish)) {
        warn('DAY_END', poi.id, 'Visit is outside the daily time window.', 'error');
      }
      if ((start !== null && start >= 1440) || (end !== null && end >= 1440)) {
        const value = end !== null && end >= 1440 ? end : start!;
        warn('DAY_END', poi.id, `Visit crosses midnight: ${overflow(day.date, value)}.`, 'error');
      }
      if (windows?.length && start !== null && end !== null && start < 1440 && end < 1440) {
        const inside = windows.find(window => start! >= window.open && end! <= window.close);
        const entryWindow = windows.find(window => start! >= window.open && start! <= window.close);
        if (!inside) warn('CLOSED', poi.id, 'Visit is outside opening hours.', 'error');
        if (entryWindow?.lastEntry === null) warn('UNKNOWN_HOURS', poi.id, 'Last entry is unknown.', 'warning');
        else if (entryWindow?.lastEntry !== undefined && start > entryWindow.lastEntry) warn('LAST_ENTRY', poi.id, 'Visit begins after last entry.', 'error');
      }
      stop.start = lock ? lock.start : localTime(start);
      stop.end = lock ? lock.end : localTime(end);
      if (arrive === null || duration === null || start === null) departure = null;
      else {
        departure = Math.max(arrive, start) + duration;
        if (lock && departure >= 1440) {
          warn('DAY_END', poi.id, `Earliest possible departure crosses midnight: ${overflow(day.date, departure)}.`, 'error');
        }
        if (lock && departure > finish && (end === null || end <= finish)) {
          warn('DAY_END', poi.id, 'Earliest possible departure is after the daily window.', 'error');
        }
      }
      previous = poi;
    }
    day.legs = newLegs;
  }

  const cost = calculateCost(trip, days, input.allPois, input.fxRates);
  warnings.push(...cost.warnings);
  const count = days.reduce((total, day) => total + day.stops.length, 0);
  const knownImpossible = unscheduled.some(item => ['CLOSED', 'LAST_ENTRY', 'DAY_END', 'OVERLAP', 'BUDGET'].includes(item.code));
  const hasNull = days.some(day => day.stops.some(stop => stop.arrive === null || stop.start === null || stop.end === null));
  const status = warnings.some(warning => warning.severity === 'error') || (count === 0 && knownImpossible)
    ? 'infeasible' : warnings.length || unscheduled.length || hasNull ? 'needs_review' : 'feasible';
  return { tripId: trip.id, status, days, unscheduled, warnings, estimatedTotalCost: cost.estimatedTotalCost };
}

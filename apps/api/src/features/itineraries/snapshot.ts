import type {
  Category,
  Currency,
  FxRate,
  ItineraryDay,
  KnownStatus,
  Money,
  PlanResult,
  PlannedStop,
  PlannerInput,
  PlanWarning,
  POI,
  TimeOverride,
  TravelLeg,
  TravelMode,
  TripConfig,
  WarningCode,
  WeeklyWindow,
} from '@tripmate/contracts';
import { ItineraryError } from './errors.js';

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const DECIMAL_PATTERN = /^(?:\d+|\d*\.\d+)$/;

const CATEGORIES: Category[] = ['history', 'food', 'shopping', 'nature'];
const CURRENCIES: Currency[] = ['MOP', 'HKD', 'CNY'];
const KNOWN_STATUSES: KnownStatus[] = ['verified', 'estimated', 'unknown'];
const TRAVEL_MODES: TravelMode[] = ['walk', 'bus', 'taxi'];
const WARNING_CODES: WarningCode[] = [
  'CLOSED',
  'LAST_ENTRY',
  'DAY_END',
  'OVERLAP',
  'BUDGET',
  'UNKNOWN_HOURS',
  'UNKNOWN_TRAVEL',
  'UNKNOWN_PRICE',
  'UNSCHEDULED',
  'UNKNOWN_DURATION',
  'UNKNOWN_FX',
];

type JsonRecord = Record<string, unknown>;

function corrupt(): never {
  throw new ItineraryError(409, 'DATA_INTEGRITY_ERROR', '已保存行程数据损坏。');
}

function record(value: unknown, keys: readonly string[]): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return corrupt();
  const candidate = value as JsonRecord;
  const actualKeys = Object.keys(candidate);
  if (
    actualKeys.length !== keys.length ||
    actualKeys.some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(candidate, key))
  ) {
    return corrupt();
  }
  return candidate;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : corrupt();
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : corrupt();
}

function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}

function uuid(value: unknown): string {
  const candidate = text(value);
  return UUID_PATTERN.test(candidate) ? candidate : corrupt();
}

function nullableUuid(value: unknown): string | null {
  return value === null ? null : uuid(value);
}

function localDate(value: unknown): string {
  const candidate = text(value);
  if (!DATE_PATTERN.test(candidate)) return corrupt();
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === candidate
    ? candidate
    : corrupt();
}

function localTime(value: unknown): string {
  const candidate = text(value);
  return TIME_PATTERN.test(candidate) ? candidate : corrupt();
}

function nullableLocalTime(value: unknown): string | null {
  return value === null ? null : localTime(value);
}

function timestamp(value: unknown): string {
  const candidate = text(value);
  return TIMESTAMP_PATTERN.test(candidate) && !Number.isNaN(Date.parse(candidate))
    ? candidate
    : corrupt();
}

function nullableTimestamp(value: unknown): string | null {
  return value === null ? null : timestamp(value);
}

function integer(value: unknown, minimum: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
    ? value
    : corrupt();
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): T {
  const candidate = text(value);
  return values.includes(candidate as T) ? candidate as T : corrupt();
}

function stringArray(value: unknown): string[] {
  return array(value).map(text);
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function coversEveryDate(startDate: string, endDate: string, dates: string[]): boolean {
  const ordered = [...dates].sort();
  let cursor = startDate;
  for (const date of ordered) {
    if (date !== cursor || date > endDate) return false;
    const next = new Date(`${cursor}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = next.toISOString().slice(0, 10);
  }
  return cursor > endDate;
}

function money(value: unknown): Money {
  const candidate = record(value, ['amountMinor', 'currency']);
  return {
    amountMinor: integer(candidate.amountMinor, 0),
    currency: oneOf(candidate.currency, CURRENCIES),
  };
}

function nullableMoney(value: unknown): Money | null {
  return value === null ? null : money(value);
}

function position(value: unknown): POI['position'] {
  const candidate = record(value, ['lat', 'lng']);
  const lat = typeof candidate.lat === 'number' ? candidate.lat : corrupt();
  const lng = typeof candidate.lng === 'number' ? candidate.lng : corrupt();
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return corrupt();
  }
  return { lat, lng };
}

function weeklyWindow(value: unknown): WeeklyWindow {
  const candidate = record(value, ['weekday', 'open', 'close', 'lastEntry']);
  const weekday = integer(candidate.weekday, 1);
  const open = localTime(candidate.open);
  const close = localTime(candidate.close);
  const lastEntry = nullableLocalTime(candidate.lastEntry);
  if (weekday > 7 || open >= close || (lastEntry !== null && (lastEntry < open || lastEntry > close))) {
    return corrupt();
  }
  return { weekday, open, close, lastEntry };
}

function openingHours(value: unknown): WeeklyWindow[] | null {
  if (value === null) return null;
  const windows = array(value).map(weeklyWindow);
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const slots = windows
      .filter((window) => window.weekday === weekday)
      .sort((left, right) => left.open.localeCompare(right.open));
    if (slots.some((window, index) => index > 0 && slots[index - 1]!.close > window.open)) {
      return corrupt();
    }
  }
  return windows;
}

function poi(value: unknown): POI {
  const candidate = record(value, [
    'id',
    'name',
    'category',
    'tags',
    'position',
    'address',
    'openingHours',
    'suggestedVisitMinutes',
    'price',
    'verification',
    'sourceUrl',
    'checkedAt',
    'bookingNote',
  ]);
  return {
    id: uuid(candidate.id),
    name: text(candidate.name),
    category: oneOf(candidate.category, CATEGORIES),
    tags: stringArray(candidate.tags),
    position: position(candidate.position),
    address: text(candidate.address),
    openingHours: openingHours(candidate.openingHours),
    suggestedVisitMinutes:
      candidate.suggestedVisitMinutes === null
        ? null
        : integer(candidate.suggestedVisitMinutes, 1),
    price: nullableMoney(candidate.price),
    verification: oneOf(candidate.verification, KNOWN_STATUSES),
    sourceUrl: nullableText(candidate.sourceUrl),
    checkedAt: nullableTimestamp(candidate.checkedAt),
    bookingNote: nullableText(candidate.bookingNote),
  };
}

function trip(value: unknown): TripConfig {
  const candidate = record(value, [
    'id',
    'title',
    'startDate',
    'endDate',
    'origin',
    'dayWindows',
    'interests',
    'budget',
    'pace',
  ]);
  const origin = record(candidate.origin, ['label', 'position', 'source']);
  const dayWindows = array(candidate.dayWindows).map((item) => {
    const window = record(item, ['date', 'start', 'end']);
    const dayWindow = {
      date: localDate(window.date),
      start: localTime(window.start),
      end: localTime(window.end),
    };
    if (dayWindow.start >= dayWindow.end) return corrupt();
    return dayWindow;
  });
  const interests = array(candidate.interests).map((item) => oneOf(item, CATEGORIES));
  const startDate = localDate(candidate.startDate);
  const endDate = localDate(candidate.endDate);
  if (
    startDate > endDate ||
    !unique(dayWindows.map((item) => item.date)) ||
    !unique(interests) ||
    !coversEveryDate(startDate, endDate, dayWindows.map((item) => item.date))
  ) {
    return corrupt();
  }
  return {
    id: uuid(candidate.id),
    title: text(candidate.title),
    startDate,
    endDate,
    origin: {
      label: text(origin.label),
      position: position(origin.position),
      source: oneOf(origin.source, ['curated', 'manual']),
    },
    dayWindows,
    interests,
    budget: nullableMoney(candidate.budget),
    pace: oneOf(candidate.pace, ['standard', 'relaxed']),
  };
}

function fxRate(value: unknown): FxRate {
  const candidate = record(value, ['from', 'to', 'decimalRate', 'asOf', 'source']);
  const decimalRate = text(candidate.decimalRate);
  if (!DECIMAL_PATTERN.test(decimalRate) || Number(decimalRate) <= 0) return corrupt();
  return {
    from: oneOf(candidate.from, CURRENCIES),
    to: oneOf(candidate.to, CURRENCIES),
    decimalRate,
    asOf: nullableTimestamp(candidate.asOf),
    source: nullableText(candidate.source),
  };
}

function plannerInput(value: unknown): PlannerInput {
  const candidate = record(value, ['trip', 'selectedPois', 'defaultTravelMode', 'fxRates']);
  const selectedPois = array(candidate.selectedPois).map(poi);
  if (!unique(selectedPois.map((item) => item.id))) return corrupt();
  return {
    trip: trip(candidate.trip),
    selectedPois,
    defaultTravelMode: oneOf(candidate.defaultTravelMode, TRAVEL_MODES),
    fxRates: array(candidate.fxRates).map(fxRate),
  };
}

function plannedStop(value: unknown, dayDate: string): PlannedStop {
  const candidate = record(value, ['id', 'poiId', 'date', 'arrive', 'start', 'end']);
  const date = localDate(candidate.date);
  if (date !== dayDate) return corrupt();
  const start = nullableLocalTime(candidate.start);
  const end = nullableLocalTime(candidate.end);
  if (start !== null && end !== null && start >= end) {
    return corrupt();
  }
  return {
    id: uuid(candidate.id),
    poiId: uuid(candidate.poiId),
    date,
    arrive: nullableLocalTime(candidate.arrive),
    start,
    end,
  };
}

function travelLeg(value: unknown): TravelLeg {
  const candidate = record(value, [
    'fromPoiId',
    'toPoiId',
    'mode',
    'durationMinutes',
    'estimatedCost',
    'estimateStatus',
  ]);
  return {
    fromPoiId: nullableUuid(candidate.fromPoiId),
    toPoiId: uuid(candidate.toPoiId),
    mode: oneOf(candidate.mode, TRAVEL_MODES),
    durationMinutes:
      candidate.durationMinutes === null ? null : integer(candidate.durationMinutes, 0),
    estimatedCost: nullableMoney(candidate.estimatedCost),
    estimateStatus: oneOf(candidate.estimateStatus, KNOWN_STATUSES),
  };
}

function itineraryDay(value: unknown): ItineraryDay {
  const candidate = record(value, ['date', 'stops', 'legs']);
  const date = localDate(candidate.date);
  const stops = array(candidate.stops).map((item) => plannedStop(item, date));
  const legs = array(candidate.legs).map(travelLeg);
  if (
    stops.length !== legs.length ||
    stops.some((stop, index) => stop.poiId !== legs[index]?.toPoiId) ||
    legs.some((leg, index) =>
      index === 0
        ? leg.fromPoiId !== null
        : leg.fromPoiId !== stops[index - 1]?.poiId,
    ) ||
    !unique(stops.map((stop) => stop.id)) ||
    !unique(stops.map((stop) => stop.poiId))
  ) {
    return corrupt();
  }
  return { date, stops, legs };
}

function warning(value: unknown): PlanWarning {
  const candidate = record(value, ['code', 'poiId', 'message', 'severity']);
  return {
    code: oneOf(candidate.code, WARNING_CODES),
    poiId: nullableUuid(candidate.poiId),
    message: text(candidate.message),
    severity: oneOf(candidate.severity, ['info', 'warning', 'error']),
  };
}

function unscheduled(value: unknown): PlanResult['unscheduled'][number] {
  const candidate = record(value, ['poiId', 'reason', 'code']);
  return {
    poiId: uuid(candidate.poiId),
    reason: text(candidate.reason),
    code: oneOf(candidate.code, WARNING_CODES),
  };
}

function planResult(value: unknown, input: PlannerInput, tripId: string): PlanResult {
  const candidate = record(value, [
    'tripId',
    'status',
    'days',
    'unscheduled',
    'warnings',
    'estimatedTotalCost',
  ]);
  const days = array(candidate.days).map(itineraryDay);
  const unscheduledItems = array(candidate.unscheduled).map(unscheduled);
  const warnings = array(candidate.warnings).map(warning);
  if (
    uuid(candidate.tripId) !== tripId ||
    input.trip.id !== tripId ||
    !unique(days.map((day) => day.date)) ||
    !unique(unscheduledItems.map((item) => item.poiId))
  ) {
    return corrupt();
  }

  const expectedDates = input.trip.dayWindows.map((window) => window.date).sort();
  const actualDates = days.map((day) => day.date).sort();
  if (
    expectedDates.length !== actualDates.length ||
    expectedDates.some((date, index) => date !== actualDates[index])
  ) {
    return corrupt();
  }

  const selectedIds = new Set(input.selectedPois.map((item) => item.id));
  const scheduledIds = days.flatMap((day) => day.stops.map((stop) => stop.poiId));
  const unscheduledIds = unscheduledItems.map((item) => item.poiId);
  const allScheduled = new Set(scheduledIds);
  if (
    !unique(scheduledIds) ||
    scheduledIds.some((id) => !selectedIds.has(id)) ||
    unscheduledIds.some((id) => !selectedIds.has(id) || allScheduled.has(id)) ||
    scheduledIds.length + unscheduledIds.length !== selectedIds.size ||
    warnings.some((item) => item.poiId !== null && !selectedIds.has(item.poiId))
  ) {
    return corrupt();
  }

  return {
    tripId,
    status: oneOf(candidate.status, ['feasible', 'needs_review', 'infeasible']),
    days,
    unscheduled: unscheduledItems,
    warnings,
    estimatedTotalCost: nullableMoney(candidate.estimatedTotalCost),
  };
}

function timeOverride(value: unknown): TimeOverride {
  const candidate = record(value, ['stopId', 'start', 'end']);
  const start = localTime(candidate.start);
  const end = localTime(candidate.end);
  if (
    start >= end ||
    Number(start.slice(3)) % 15 !== 0 ||
    Number(end.slice(3)) % 15 !== 0
  ) {
    return corrupt();
  }
  return { stopId: uuid(candidate.stopId), start, end };
}

export function validateStoredSnapshot(
  rawInput: unknown,
  rawResult: unknown,
  rawTimeOverrides: unknown,
  tripId: string,
): { input: PlannerInput; result: PlanResult; timeOverrides: TimeOverride[] } {
  const input = plannerInput(rawInput);
  const result = planResult(rawResult, input, tripId);
  const timeOverrides = array(rawTimeOverrides).map(timeOverride);
  const stopById = new Map(
    result.days.flatMap((day) => day.stops).map((stop) => [stop.id, stop]),
  );
  if (
    !unique(timeOverrides.map((item) => item.stopId)) ||
    timeOverrides.some((item) => {
      const stop = stopById.get(item.stopId);
      return !stop || stop.start !== item.start || stop.end !== item.end;
    })
  ) {
    return corrupt();
  }
  return { input, result, timeOverrides };
}

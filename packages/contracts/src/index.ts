export type Category = 'history' | 'food' | 'shopping' | 'nature';
export type Currency = 'MOP' | 'HKD' | 'CNY';
export type Money = { amountMinor: number; currency: Currency };
export type GeoPoint = { lat: number; lng: number };
export type KnownStatus = 'verified' | 'estimated' | 'unknown';
export type WeeklyWindow = { weekday: number; open: string; close: string; lastEntry: string | null };
export type POI = {
  id: string; name: string; category: Category; tags: string[];
  position: GeoPoint; address: string;
  openingHours: WeeklyWindow[] | null; // null=unknown, []=known closed whole week
  suggestedVisitMinutes: number | null; price: Money | null;
  verification: KnownStatus; sourceUrl: string | null; checkedAt: string | null; bookingNote: string | null;
};
export type TripConfig = {
  id: string; title: string; startDate: string; endDate: string;
  origin: { label: string; position: GeoPoint; source: 'curated' | 'manual' };
  dayWindows: Array<{ date: string; start: string; end: string }>;
  interests: Category[]; budget: Money | null;
  pace: 'standard' | 'relaxed';
};
export type TravelMode = 'walk' | 'bus' | 'taxi';
export type PlannedStop = { id: string; poiId: string; date: string; arrive: string | null; start: string | null; end: string | null };
export type TravelLeg = {
  fromPoiId: string | null; toPoiId: string; mode: TravelMode;
  durationMinutes: number | null; estimatedCost: Money | null;
  estimateStatus: KnownStatus;
};
export type WarningCode = 'CLOSED' | 'LAST_ENTRY' | 'DAY_END' | 'OVERLAP' |
  'BUDGET' | 'UNKNOWN_HOURS' | 'UNKNOWN_TRAVEL' | 'UNKNOWN_PRICE' | 'UNSCHEDULED' | 'UNKNOWN_DURATION' | 'UNKNOWN_FX';
export type PlanWarning = { code: WarningCode; poiId: string | null; message: string; severity: 'info'|'warning'|'error' };
export type ItineraryDay = { date: string; stops: PlannedStop[]; legs: TravelLeg[] };
export type PlanResult = {
  tripId: string; status: 'feasible' | 'needs_review' | 'infeasible';
  days: ItineraryDay[];
  unscheduled: Array<{ poiId: string; reason: string; code: WarningCode }>;
  warnings: PlanWarning[];
  estimatedTotalCost: Money | null;
};

export type FxRate = { from: Currency; to: Currency; decimalRate: string; asOf: string | null; source: string | null };
export type PlannerInput = {
  trip: TripConfig; selectedPois: POI[]; defaultTravelMode: TravelMode;
  fxRates: FxRate[]; // no companion or expenses
};
export type EditCommand =
  | { type: 'setVisitTime'; stopId: string; start: string; end: string }
  | { type: 'setTransportMode'; date: string; toPoiId: string; mode: TravelMode }
  | { type: 'removeStop'; stopId: string; confirmed: true };
export type RecalculationInput = {
  trip: TripConfig; allPois: POI[]; current: PlanResult;
  command: EditCommand; fxRates: FxRate[]; timeOverrides: TimeOverride[];
};
export type SavedItinerary = { id: string; tripId: string; version: number; input: PlannerInput; result: PlanResult; timeOverrides: TimeOverride[]; updatedAt: string };
export type PublishedPostPublic = {
  id: string; title: string; publishedAt: string;
  days: Array<{ date: string; poiIds: string[] }>;
}; // exact public field whitelist; NEVER embed TripConfig or expenses

// Temporary implementation baseline: leader authorization 2026-11-02, not team approval.
export type UUID = string;
export type LocalDate = string;
export type LocalTime = string;
export type Timestamp = string;
export type Success<T> = { data: T };
export type Failure = { error: { code: string; message: string; details: Record<string, unknown> | null } };
export type List<T> = { items: T[]; total: number };
export type Health = { status: 'ok'; database: 'ok' };
export type Member = 'A' | 'B' | 'C' | 'D';
export type TimeOverride = { stopId: string; start: string; end: string };
export type CandidatePlan = { input: PlannerInput; result: PlanResult; commands: EditCommand[] };
export type TargetsView = { tripId: string; poiIds: string[] };
export type FavoriteState = { poiId: string; favorited: boolean };
export type Companion = { id: string; tripId: string; name: string };
export type OriginOption = { id: string; label: string; position: GeoPoint };
export type CreateTripRequest = Omit<TripConfig, 'id' | 'pace'> & { pace?: TripConfig['pace'] };
export type PatchTripRequest = Partial<Omit<TripConfig, 'id'>>;
export type GenerateRequest = { action?: 'generate'; defaultTravelMode?: TravelMode };
export type DraftEditRequest = { action: 'editDraft'; candidate: CandidatePlan; command: EditCommand };
export type EditRequest = { expectedVersion: number; command: EditCommand };
export type SaveItineraryRequest =
 | { mode: 'create'; candidate: CandidatePlan }
 | { mode: 'overwrite'; itineraryId: string; expectedVersion: number; confirmed: true; candidate: CandidatePlan };
export type PublicContent = { title: string; days: Array<{ date: string; poiIds: string[] }> };
export type PublishPreview = { previewToken: string; itineraryId: string; expectedVersion: number; expiresAt: string; content: PublicContent };
export type PublishRequest =
 | { action: 'preview'; expectedVersion: number; title: string }
 | { action: 'confirm'; expectedVersion: number; previewToken: string; confirmed: true };
export type Expense = { id: string; tripId: string; place: string; poiId: string | null; payerId: string; participantIds: string[]; original: Money; fxToCny: FxRate | null; createdAt: string };
export type CreateExpenseRequest = Pick<Expense, 'place' | 'poiId' | 'payerId' | 'participantIds' | 'original'>;
export type Settlement = { tripId: string; currency: 'CNY'; status: 'complete' | 'unavailable'; unresolvedExpenseIds: string[]; people: Array<{ companionId: string; paidMinor: number; shareMinor: number; netMinor: number }>; transfers: Array<{ fromId: string; toId: string; amountMinor: number }> };
export interface PlannerService {
 generatePlan(input: PlannerInput): PlanResult;
 revalidateAndRecalculate(input: RecalculationInput): PlanResult;
}

# TripMate Macau — Shared Contract v1 (FROZEN DRAFT)
# Status: implementation baseline proposed for four-person approval.
# All four owners must agree before work starts; changing a field requires a contract PR.

Monorepo: apps/web, apps/api, packages/contracts, data/fixtures, docs, tests/e2e.
Frontend: Vue 3 + Vite + TypeScript + Tailwind CSS.
Backend: Node.js + Express + TypeScript + Prisma/SQLite.
Map: Leaflet + OpenStreetMap. Planner: pure TypeScript functions. Tests: Vitest + Supertest + Playwright.
Transport: HTTP /api/v1, JSON UTF-8; success { data: ... }; failure { error: { code, message, details? } }.
IDs: stable UUID strings; dates YYYY-MM-DD; local times HH:mm in Asia/Macau, no JS Date implicit parsing.
Money: integer minor units with explicit currency MOP|HKD|CNY; FX decimal strings and source/asOf.
Unknown availability or price: null plus status/label, never zero or confirmed open.
POI Favorites are separate from Trip Targets. Companions are never passed to planner.
Planning returns scheduled + unscheduled selected POIs and warnings. Never silently drop POIs.
Only D persists itinerary and publishes; C calculates and rechecks; B reads Plaza/favorites; A owns core schema.
Protected: packages/contracts/**, apps/api/prisma/**, repo tooling, apps/api/src/app.ts → A approval.
Shared router: apps/web/src/router/**, global CSS and UI tokens → B approval.
Cross-module changes: propose PR with consumer test + review; never bypass a protected owner.

Source-of-truth interface prototypes (canonical shapes, adjust via approved PR only):

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
  verification: KnownStatus; sourceUrl: string | null; checkedAt: string | null;
};
export type TripConfig = {
  id: string; title: string; startDate: string; endDate: string;
  origin: { label: string; position: GeoPoint; source: 'curated' | 'manual' };
  dayWindows: Array<{ date: string; start: string; end: string }>;
  interests: Category[]; budget: Money | null;
  pace: 'standard' | 'relaxed';
};
export type TravelMode = 'walk' | 'bus' | 'taxi';
export type PlannedStop = { id: string; poiId: string; date: string; arrive: string; start: string; end: string };
export type TravelLeg = {
  fromPoiId: string | null; toPoiId: string; mode: TravelMode;
  durationMinutes: number | null; estimatedCost: Money | null;
  estimateStatus: KnownStatus;
};
export type WarningCode = 'CLOSED' | 'LAST_ENTRY' | 'DAY_END' | 'OVERLAP' |
  'BUDGET' | 'UNKNOWN_HOURS' | 'UNKNOWN_TRAVEL' | 'UNKNOWN_PRICE' | 'UNSCHEDULED';
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
  command: EditCommand; fxRates: FxRate[];
};
export type SavedItinerary = { id: string; tripId: string; version: number; result: PlanResult; updatedAt: string };
export type PublishedPostPublic = {
  id: string; title: string; publishedAt: string;
  days: Array<{ date: string; poiIds: string[] }>;
}; // exact public field whitelist; NEVER embed TripConfig or expenses

# C must export generatePlan(input: PlannerInput): PlanResult and
# revalidateAndRecalculate(input: RecalculationInput): PlanResult.
# D is sole itinerary persistence and publishing owner. D validates expectedVersion
# against SavedItinerary.version on POST edits (409 for version mismatch).
# D calls C functions in backend; D does not independently invent a second scheduling rule.
# Sensitive information (companions, bills, budget, private notes) MUST NOT be copied to plazaPosts.

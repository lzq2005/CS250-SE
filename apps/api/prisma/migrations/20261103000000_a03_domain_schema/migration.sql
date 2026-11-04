-- A-03: additive migration; bootstrap table/data are preserved.
-- CHECK constraints below are intentional SQLite SQL (not expressible in Prisma).
-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "originLabel" TEXT NOT NULL,
    "originLat" REAL NOT NULL,
    "originLng" REAL NOT NULL,
    "originSource" TEXT NOT NULL,
    "interests" JSONB NOT NULL,
    "budgetAmountMinor" BIGINT,
    "budgetCurrency" TEXT,
    "pace" TEXT NOT NULL DEFAULT 'standard',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trip_title_check" CHECK (length(trim("title")) > 0),
    CONSTRAINT "Trip_dates_check" CHECK ("startDate" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND "endDate" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND "startDate" <= "endDate"),
    CONSTRAINT "Trip_origin_check" CHECK ("originSource" IN ('curated','manual') AND "originLat" BETWEEN -90 AND 90 AND "originLng" BETWEEN -180 AND 180),
    CONSTRAINT "Trip_pace_check" CHECK ("pace" IN ('standard','relaxed')),
    CONSTRAINT "Trip_interests_check" CHECK (json_valid("interests") AND json_type("interests") = 'array'),
    CONSTRAINT "Trip_budget_check" CHECK (("budgetAmountMinor" IS NULL AND "budgetCurrency" IS NULL) OR ("budgetAmountMinor" IS NOT NULL AND "budgetCurrency" IS NOT NULL AND typeof("budgetAmountMinor") = 'integer' AND "budgetAmountMinor" BETWEEN 0 AND 9007199254740991 AND "budgetCurrency" IN ('MOP','HKD','CNY')))
);

-- CreateTable
CREATE TABLE "DayWindow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    CONSTRAINT "DayWindow_time_check" CHECK ("start" GLOB '[0-2][0-9]:[0-5][0-9]' AND "end" GLOB '[0-2][0-9]:[0-5][0-9]' AND "start" < '24:00' AND "end" < '24:00' AND "start" < "end"),
    CONSTRAINT "DayWindow_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Companion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Companion_name_check" CHECK (length(trim("name")) > 0),
    CONSTRAINT "Companion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "POI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "openingHours" JSONB,
    "suggestedVisitMinutes" INTEGER,
    "priceAmountMinor" BIGINT,
    "priceCurrency" TEXT,
    "verification" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "checkedAt" DATETIME,
    "bookingNote" TEXT,
    CONSTRAINT "POI_category_check" CHECK ("category" IN ('history','food','shopping','nature')),
    CONSTRAINT "POI_verification_check" CHECK ("verification" IN ('verified','estimated','unknown')),
    CONSTRAINT "POI_position_check" CHECK ("lat" BETWEEN -90 AND 90 AND "lng" BETWEEN -180 AND 180),
    CONSTRAINT "POI_tags_check" CHECK (json_valid("tags") AND json_type("tags") = 'array'),
    CONSTRAINT "POI_hours_check" CHECK ("openingHours" IS NULL OR (json_valid("openingHours") AND json_type("openingHours") = 'array')),
    CONSTRAINT "POI_duration_check" CHECK ("suggestedVisitMinutes" IS NULL OR (typeof("suggestedVisitMinutes") = 'integer' AND "suggestedVisitMinutes" > 0)),
    CONSTRAINT "POI_price_check" CHECK (("priceAmountMinor" IS NULL AND "priceCurrency" IS NULL) OR ("priceAmountMinor" IS NOT NULL AND "priceCurrency" IS NOT NULL AND typeof("priceAmountMinor") = 'integer' AND "priceAmountMinor" BETWEEN 0 AND 9007199254740991 AND "priceCurrency" IN ('MOP','HKD','CNY')))
);

-- CreateTable
CREATE TABLE "TripTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripTarget_position_check" CHECK (typeof("position") = 'integer' AND "position" >= 0),
    CONSTRAINT "TripTarget_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TripTarget_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "POI" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poiId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "POI" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedItinerary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "input" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "timeOverrides" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedItinerary_version_check" CHECK (typeof("version") = 'integer' AND "version" > 0),
    CONSTRAINT "SavedItinerary_input_check" CHECK (json_valid("input") AND json_type("input") = 'object' AND json_type("input", '$.trip.id') IS 'text' AND json_extract("input", '$.trip.id') = "tripId"),
    CONSTRAINT "SavedItinerary_result_check" CHECK (json_valid("result") AND json_type("result") = 'object' AND json_type("result", '$.tripId') IS 'text' AND json_extract("result", '$.tripId') = "tripId"),
    CONSTRAINT "SavedItinerary_overrides_check" CHECK (json_valid("timeOverrides") AND json_type("timeOverrides") = 'array'),
    CONSTRAINT "SavedItinerary_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DayWindow_tripId_date_key" ON "DayWindow"("tripId", "date");

-- CreateIndex
CREATE INDEX "Companion_tripId_createdAt_id_idx" ON "Companion"("tripId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "TripTarget_poiId_idx" ON "TripTarget"("poiId");

-- CreateIndex
CREATE UNIQUE INDEX "TripTarget_tripId_poiId_key" ON "TripTarget"("tripId", "poiId");

-- CreateIndex
CREATE UNIQUE INDEX "TripTarget_tripId_position_key" ON "TripTarget"("tripId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_poiId_key" ON "Favorite"("poiId");

-- CreateIndex
CREATE INDEX "SavedItinerary_tripId_createdAt_id_idx" ON "SavedItinerary"("tripId", "createdAt", "id");

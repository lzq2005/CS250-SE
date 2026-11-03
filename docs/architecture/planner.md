# Planner implementation

Member C owns these pure TypeScript functions under `apps/api/src/features/planning`:

- `generatePlan(input: PlannerInput): PlanResult` creates a candidate from the supplied trip and POI snapshots.
- `revalidateAndRecalculate(input: RecalculationInput): PlanResult` applies one edit and rechecks the existing schedule.
- `plannerService` exposes both functions through the existing shared `PlannerService` interface.

The functions do not access the database or mutate their inputs. D supplies saved snapshots and time overrides for edits. The HTTP generate/draft adapter requires A and B's trip, target and POI read services; those services and route registration are not yet available in the bootstrap. Error-to-HTTP mapping is the future adapter's responsibility.

## Estimate and unknown-data boundaries

Walking time is a straight-line Haversine distance divided by an assumed 4 km/h, rounded up to whole minutes. The speed is a simple model informed by the [CDC brisk-walking example of 2.5 mph](https://www.cdc.gov/physical-activity-basics/measuring/index.html), not a measurement of Macau routes. The model does not account for roads, water crossings, traffic or an individual's walking speed; each walking leg is marked `estimated`. Bus and taxi duration and price remain unknown until a sourced model is available; walking has no fare.

Unknown visit duration, opening hours, last entry, travel or prices are retained and marked in the result. Selected POIs are represented exactly once as a stop or an unscheduled entry. Relaxed pace is optional and currently disabled; `generatePlan` rejects it with `OPTION_NOT_ENABLED` rather than treating it as standard. It is the future adapter's responsibility to translate that condition into the agreed HTTP response.

## Validation

Run the planner-specific tests from the repository root:

```sh
npx vitest run --config tests/fixtures/planning/vitest.config.ts
```

The bootstrap's root Vitest configuration discovers only `tests/unit/**/*.test.ts`; it does not currently run the C-owned planner fixture tests. A must coordinate any shared CI/test configuration change. Also run `npm run check` for the existing repository checks.

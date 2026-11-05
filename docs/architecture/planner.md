# Planner implementation: C-01

`generatePlan(input: PlannerInput): PlanResult` is exported by `apps/api/src/features/planning/index.ts`. It is a pure function using the existing shared contracts: it does not mutate input, access storage or register HTTP routes.

It retains every selected POI as either a scheduled stop or an unscheduled entry with a reason. Unknown information is flagged, not treated as zero or confirmed availability. Walking is estimated from straight-line distance at 4 km/h; bus and taxi estimates remain unknown. The walking estimate is an illustrative assumption, not live Macau routing data. Relaxed pace is not enabled.

C-02 groups nearby POIs by stable ID order using anchors within 1.2 km. Each day begins at the trip origin; it prefers a stop in the current group when that adds no more than 0.35 km compared with the nearest remaining candidate. It still checks opening and daily windows and tries other groups when a candidate cannot be visited. Distances are local straight-line approximations, not administrative district boundaries or real routes. This heuristic reduces obvious backtracking in typical cases but does not guarantee the shortest route or a feasible ordering when one exists.

The HTTP adapter and real Trip/POI/target data depend on A and B; this slice does not claim end-to-end integration. Editing and recalculation are separate work.

Run `npx vitest run --config tests/fixtures/planning/vitest.config.ts` for the C-owned fixture tests. The current root Vitest config does not discover these tests; shared CI configuration changes require A coordination. Also run `npm run check`.

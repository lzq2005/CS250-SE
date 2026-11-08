# Planner implementation: C-01

`generatePlan(input: PlannerInput): PlanResult` is exported by `apps/api/src/features/planning/index.ts`. It is a pure function using the existing shared contracts: it does not mutate input, access storage or register HTTP routes.

It retains every selected POI as either a scheduled stop or an unscheduled entry with a reason. Unknown information is flagged, not treated as zero or confirmed availability. Walking is estimated from straight-line distance at 4 km/h; bus and taxi use the simulated model below. None is live Macau routing data. Relaxed pace is not enabled.

C-02 groups nearby POIs by stable ID order using anchors within 1.2 km. Each day begins at the trip origin; it prefers a stop in the current group when that adds no more than 0.35 km compared with the nearest remaining candidate. It still checks opening and daily windows and tries other groups when a candidate cannot be visited. Distances are local straight-line approximations, not administrative district boundaries or real routes. This heuristic reduces obvious backtracking in typical cases but does not guarantee the shortest route or a feasible ordering when one exists.

C-03 checks the applicable weekday, each opening window, last entry, the entire visit duration and the daily end. A visit may start exactly at last entry and finish exactly at closing or day end. When an open day has a time conflict, a later closed day does not replace that more useful reason. Unknown last-entry information remains a warning rather than a guarantee.

C-04 estimates legs using these **simulation assumptions**, not live routes, traffic, schedules or confirmed prices. Every modeled leg is marked `estimated`; each bus or taxi leg also has an `UNKNOWN_TRAVEL` warning explaining the simulation, so a plan using it requires review. Invalid coordinates yield null duration/cost and `unknown`, with the target retained as unscheduled.

- Walking: straight-line distance at 4 km/h, rounded up to minutes, with no walking fare.
- Bus: assume one MOP 6 cash-fare ride per person, a road distance of 1.3 times the straight-line distance, 15 km/h, and an eight-minute access/wait allowance. This does not identify a real route or number of transfers; transfer fares, discounts and unavailable services are not modeled.
- Taxi: assume the same 1.3 distance factor, 25 km/h and a five-minute pickup allowance. Simulated meter fare is MOP 21 for the first 1,600 m plus MOP 2 per started 220 m thereafter. Explicitly recognizable location text adds MOP 8 for pickup at Macau International Airport, Taipa Ferry Terminal, Hengqin Port or the Hong Kong-Zhuhai-Macao Bridge port; MOP 5 for pickup at the University of Macau campus; MOP 5 for Macau Peninsula to Coloane; or MOP 2 for Taipa to Coloane. Port/campus pickup and a directional surcharge may both apply. Cotai is not treated as Coloane. These text matches are approximations, not authoritative maps or taxi-stand detection. When labels do not unambiguously identify a surcharge, the model assumes none. Luggage, metered waiting, special/radio taxi fees and other extras are not modeled. Taxi fare is per taxi; bus fare is per person; companions are not planner input.
- A zero-distance leg is simulated as zero minutes and zero cost for all modes. Minutes are rounded up; amounts are non-negative integer MOP minor units.

Fare references checked 2026-11-09: [Macao Government Tourism Office local transportation](https://www.macaotourism.gov.mo/en/travelessential/before-you-travel/local-transportation?fid=9898&tab=taxis) and [Macao Transport Bureau taxi fare adjustment](https://www.dsat.gov.mo/dsat/news_detail.aspx?a_id=67A7796230B28A74294FFEABC65FDB97). The 1.3 factor, speeds and allowances are project simulation assumptions; the sources do not verify individual routes or predicted travel times. Results must be displayed as estimates and actual charges may differ.

The HTTP adapter and real Trip/POI/target data depend on A and B; this slice does not claim end-to-end integration. Editing and recalculation are separate work.

Run `npx vitest run --config tests/fixtures/planning/vitest.config.ts` for the C-owned fixture tests. The current root Vitest config does not discover these tests; shared CI configuration changes require A coordination. Also run `npm run check`.

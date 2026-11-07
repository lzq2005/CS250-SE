# itineraries

Owner: D.

## D-05 SavedItinerary persistence

`createItinerariesRouter(db, dependencies)` implements the D-owned API boundary:

- `POST /trips/:tripId/itineraries`
- `GET /trips/:tripId/itineraries`
- `GET /itineraries/:itineraryId`
- `POST /itineraries/:itineraryId/edits`

The router requires two dependencies:

- `planner: PlannerService`: Member C's pure planning functions, used only to replay candidates and saved edits.
- `verifySource(input)`: A/B-owned source consistency check. Returning `false` produces
  `409 SOURCE_CHANGED`.

D owns validation, JSON snapshot persistence, optimistic version checks and reopening.
It does not implement planning, downstream propagation or conflict rules.

The router is not registered in `app.ts` by D. Member A must register it after C's
planner implementation and the source consistency adapter are available.

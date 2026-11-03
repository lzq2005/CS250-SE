# Itinerary feature

Owner: D.

## D-01 fixture preview

`ItineraryDisplay.vue` is a read-only presentation component for a contract-shaped
`PlanResult` and its resolved POIs. It displays itinerary days, ordered stops,
travel legs, nullable timing diagnostics, unscheduled POIs, and warnings.

The component imports only shared types from `@tripmate/contracts`. It does not
implement planning, editing, persistence, publishing, or map behavior.

Run the Web development server and open:

```text
/src/features/itinerary/itinerary-preview.html
```

The preview uses `d01-fixture.ts`, which is explicitly test data and is not
connected to Member C's Planning API. Member B can integrate the component when
the shared page route is available without changing this component's data
contract or global styles.

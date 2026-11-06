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

Travel legs are matched to stops by `TravelLeg.toPoiId`, not by an assumed array
position. A stop with no matching leg, or with ambiguous duplicate matches, shows
`交通资料不可用` rather than borrowing another stop's transport information.

The defensive boundary fixture is available at:

```text
/src/features/itinerary/itinerary-preview.html?scenario=leg-boundary
```

## D-03 candidate editor

`ItineraryEditor.vue` provides candidate-level time and transport editing. It
requires an injected `CandidateEditorAdapter`; successful edits replace the
current `CandidatePlan` with the adapter response. The component never calculates
feasibility, downstream propagation, or warnings locally.

```text
/src/features/itinerary/editor-preview.html
```

The standalone preview uses `d03-test-adapter.ts`, explicitly marked as a test
mock. No real C API is called. `setVisitTime` requires 15-minute times and
`start < end`; `setTransportMode` uses the active `date` and destination
`toPoiId`.

Order changes have no shared `EditCommand` and are intentionally absent. Stop
removal and overwrite confirmation remain D-04, while persistence/versioning
remain D-05.

## D-04 destructive confirmations

`DestructiveActionDialog.vue` requires an explicit confirm or cancel action.
Cancelling emits no mutation. `ItineraryEditor.vue` can optionally expose stop
removal through its existing `CandidateEditorAdapter`; the remove command keeps
the POI in `unscheduled`.

`ItineraryOverwriteAction.vue` demonstrates the SavedItinerary overwrite
confirmation boundary and sends the shared overwrite request shape only through
an injected adapter. A real save/version implementation remains D-05.

```text
/src/features/itinerary/confirmation-preview.html
```

The preview uses explicit test adapters. Single-stop replacement has no shared
`EditCommand` and is therefore not added.

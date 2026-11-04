# Itinerary map feature

Owner: D.

## D-02 fixture preview

`ItineraryMap.vue` renders a Leaflet/OpenStreetMap map from the shared
`PlanResult`, `POI[]`, and `ItineraryDay` types. The active day uses the exact
`day.stops` order for its numbered markers, connected segments, and side list.
Route segments indicate itinerary order only; they do not represent actual
walking, bus, or taxi roads.

POI names in Leaflet tooltips are inserted with `textContent`, never parsed as
HTML. Coordinates must be finite values within latitude -90..90 and longitude
-180..180. Missing POIs or invalid coordinates are kept in the ordered list and
reported without creating a fake marker.

Run the Web development server and open:

```text
/src/features/map/map-preview.html
```

Missing-POI boundary preview:

```text
/src/features/map/map-preview.html?scenario=missing-poi
```

Invalid-coordinate and unsafe-name previews:

```text
/src/features/map/map-preview.html?scenario=invalid-coordinate
/src/features/map/map-preview.html?scenario=unsafe-name
```

The preview uses the contract-shaped D-01 fixture and is explicitly marked as
not connected to Member C's real Planning API. Member B owns route registration;
this component does not modify the shared router or global styles.

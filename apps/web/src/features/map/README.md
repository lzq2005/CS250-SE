# Itinerary map feature

Owner: D.

## D-02 fixture preview

`ItineraryMap.vue` renders a Leaflet/OpenStreetMap map from the shared
`PlanResult`, `POI[]`, and `ItineraryDay` types. The active day uses the exact
`day.stops` order for its numbered markers, connected segments, and side list.

Run the Web development server and open:

```text
/src/features/map/map-preview.html
```

Missing-POI boundary preview:

```text
/src/features/map/map-preview.html?scenario=missing-poi
```

The preview uses the contract-shaped D-01 fixture and is explicitly marked as
not connected to Member C's real Planning API. Member B owns route registration;
this component does not modify the shared router or global styles.

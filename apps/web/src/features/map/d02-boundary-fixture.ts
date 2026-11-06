import type { POI } from '@tripmate/contracts';
import { d01FixturePois } from '../itinerary/d01-fixture';

const missingPoiId = '11111111-1111-4111-8111-111111111111';

export const d02MissingPoiPois: POI[] = d01FixturePois.filter((poi) => poi.id !== missingPoiId);

export const d02InvalidCoordinatePois: POI[] = d01FixturePois.map((poi) =>
  poi.id === missingPoiId
    ? { ...poi, position: { lat: 91, lng: poi.position.lng } }
    : poi,
);

export const d02UnsafeNamePois: POI[] = d01FixturePois.map((poi) =>
  poi.id === missingPoiId
    ? { ...poi, name: '<img src=x onerror="window.__mapXss=1">危险景点' }
    : poi,
);

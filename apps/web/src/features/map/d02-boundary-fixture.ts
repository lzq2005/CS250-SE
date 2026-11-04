import type { POI } from '@tripmate/contracts';
import { d01FixturePois } from '../itinerary/d01-fixture';

const missingPoiId = '11111111-1111-4111-8111-111111111111';

export const d02MissingPoiPois: POI[] = d01FixturePois.filter((poi) => poi.id !== missingPoiId);

import type { SaveItineraryRequest, SavedItinerary } from '@tripmate/contracts';

export type OverwriteItineraryRequest = Extract<
  SaveItineraryRequest,
  { mode: 'overwrite' }
>;

export interface ItineraryOverwriteAdapter {
  overwrite(request: OverwriteItineraryRequest): Promise<SavedItinerary>;
}

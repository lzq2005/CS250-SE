import type { SavedItinerary } from '@tripmate/contracts';
import type {
  ItineraryOverwriteAdapter,
  OverwriteItineraryRequest,
} from './itineraryOverwriteAdapter';

type OverwriteTestAdapter = ItineraryOverwriteAdapter & {
  requests: OverwriteItineraryRequest[];
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createD04OverwriteTestAdapter(options: { failMessage?: string } = {}): OverwriteTestAdapter {
  const requests: OverwriteItineraryRequest[] = [];
  return {
    requests,
    async overwrite(request: OverwriteItineraryRequest): Promise<SavedItinerary> {
      if (options.failMessage) throw new Error(options.failMessage);
      requests.push(clone(request));
      return {
        id: request.itineraryId,
        tripId: request.candidate.input.trip.id,
        version: request.expectedVersion + 1,
        input: clone(request.candidate.input),
        result: clone(request.candidate.result),
        timeOverrides: [],
        updatedAt: '2026-11-06T00:00:00Z',
      };
    },
  };
}

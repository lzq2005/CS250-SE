import type {
  CandidatePlan,
  EditRequest,
  SavedItinerary,
} from '@tripmate/contracts';
import {
  SavedItineraryApiError,
  type SavedItineraryAdapter,
} from './savedItineraryAdapter';
import type { OverwriteItineraryRequest } from './itineraryOverwriteAdapter';

type CreateRequest = Parameters<SavedItineraryAdapter['create']>[0];

export type D05TestAdapter = SavedItineraryAdapter & {
  createRequests: CreateRequest[];
  overwriteRequests: OverwriteItineraryRequest[];
  editRequests: EditRequest[];
};

// The preview passes Vue reactive proxies; JSON cloning strips proxies before test mutation.
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createSavedItineraryFixture(
  candidate: CandidatePlan,
  version = 1,
  id = '50000000-0000-4000-8000-000000000001',
): SavedItinerary {
  return {
    id,
    tripId: candidate.input.trip.id,
    version,
    input: clone(candidate.input),
    result: clone(candidate.result),
    timeOverrides: [],
    updatedAt: `2026-11-06T${String(Math.min(version, 23)).padStart(2, '0')}:00:00.000Z`,
  };
}

export function createD05TestAdapter(options: {
  initialItems?: SavedItinerary[];
  versionConflict?: boolean;
  failCreateMessage?: string;
} = {}): D05TestAdapter {
  let items = clone(options.initialItems ?? []);
  const createRequests: CreateRequest[] = [];
  const overwriteRequests: OverwriteItineraryRequest[] = [];
  const editRequests: EditRequest[] = [];

  return {
    createRequests,
    overwriteRequests,
    editRequests,

    async create(request) {
      if (options.failCreateMessage) throw new Error(options.failCreateMessage);
      createRequests.push(clone(request));
      const saved: SavedItinerary = {
        id: crypto.randomUUID(),
        tripId: request.candidate.input.trip.id,
        version: 1,
        input: clone(request.candidate.input),
        result: clone(request.candidate.result),
        timeOverrides: [],
        updatedAt: '2026-11-07T01:00:00.000Z',
      };
      items = [...items, saved];
      return clone(saved);
    },

    async list() {
      return { items: clone(items), total: items.length };
    },

    async get(itineraryId) {
      const saved = items.find((item) => item.id === itineraryId);
      if (!saved) throw new SavedItineraryApiError('找不到已保存行程。', 404, 'NOT_FOUND');
      return clone(saved);
    },

    async overwrite(request) {
      overwriteRequests.push(clone(request));
      const current = items.find((item) => item.id === request.itineraryId);
      if (!current) throw new SavedItineraryApiError('找不到已保存行程。', 404, 'NOT_FOUND');
      if (options.versionConflict || current.version !== request.expectedVersion) {
        if (options.versionConflict) {
          current.version = request.expectedVersion + 1;
        }
        throw new SavedItineraryApiError(
          '行程已被其他操作更新。',
          409,
          'VERSION_CONFLICT',
          { expectedVersion: request.expectedVersion, actualVersion: current.version },
        );
      }

      const saved: SavedItinerary = {
        ...current,
        version: current.version + 1,
        input: clone(request.candidate.input),
        result: clone(request.candidate.result),
        timeOverrides: [],
        updatedAt: '2026-11-07T02:00:00.000Z',
      };
      items = items.map((item) => item.id === saved.id ? saved : item);
      return clone(saved);
    },

    async edit(itineraryId, request) {
      editRequests.push(clone(request));
      const current = items.find((item) => item.id === itineraryId);
      if (!current) throw new SavedItineraryApiError('找不到已保存行程。', 404, 'NOT_FOUND');
      return clone(current);
    },
  };
}

import type {
  EditRequest,
  Failure,
  List,
  SaveItineraryRequest,
  SavedItinerary,
  Success,
} from '@tripmate/contracts';
import type {
  ItineraryOverwriteAdapter,
  OverwriteItineraryRequest,
} from './itineraryOverwriteAdapter';

type CreateItineraryRequest = Extract<SaveItineraryRequest, { mode: 'create' }>;

export class SavedItineraryApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string | null = null,
    public details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'SavedItineraryApiError';
  }
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new SavedItineraryApiError('无法连接行程保存服务。', 0);
  }

  let envelope: Success<T> | Failure;
  try {
    envelope = await response.json() as Success<T> | Failure;
  } catch {
    throw new SavedItineraryApiError('行程保存服务返回了无效响应。', response.status);
  }

  if ('error' in envelope) {
    throw new SavedItineraryApiError(
      envelope.error.message,
      response.status,
      envelope.error.code,
      envelope.error.details,
    );
  }
  if (!response.ok) {
    throw new SavedItineraryApiError('行程保存请求失败。', response.status);
  }
  return envelope.data;
}

export interface SavedItineraryAdapter extends ItineraryOverwriteAdapter {
  create(request: CreateItineraryRequest): Promise<SavedItinerary>;
  list(tripId: string): Promise<List<SavedItinerary>>;
  get(itineraryId: string): Promise<SavedItinerary>;
  overwrite(request: OverwriteItineraryRequest): Promise<SavedItinerary>;
  edit(itineraryId: string, request: EditRequest): Promise<SavedItinerary>;
}

export const savedItineraryApi: SavedItineraryAdapter = {
  create(requestBody) {
    const tripId = requestBody.candidate.input.trip.id;
    return request<SavedItinerary>(
      `/trips/${encodeURIComponent(tripId)}/itineraries`,
      'POST',
      requestBody,
    );
  },

  list(tripId) {
    return request<List<SavedItinerary>>(
      `/trips/${encodeURIComponent(tripId)}/itineraries`,
    );
  },

  get(itineraryId) {
    return request<SavedItinerary>(
      `/itineraries/${encodeURIComponent(itineraryId)}`,
    );
  },

  overwrite(requestBody) {
    const tripId = requestBody.candidate.input.trip.id;
    return request<SavedItinerary>(
      `/trips/${encodeURIComponent(tripId)}/itineraries`,
      'POST',
      requestBody,
    );
  },

  edit(itineraryId, requestBody) {
    return request<SavedItinerary>(
      `/itineraries/${encodeURIComponent(itineraryId)}/edits`,
      'POST',
      requestBody,
    );
  },
};

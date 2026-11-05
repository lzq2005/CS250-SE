import type { CreateTripRequest, Failure, List, OriginOption, PatchTripRequest, Success, TripConfig } from '@tripmate/contracts';
export class TripApiError extends Error {
  constructor(message: string, public details: Record<string, unknown> | null) { super(message); }
}
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const envelope = await response.json() as Success<T> | Failure;
  if ('error' in envelope) throw new TripApiError(envelope.error.message, envelope.error.details);
  if (!response.ok) throw new Error('保存失败，请重试。');
  return envelope.data;
}
export const tripApi = {
  list: () => call<List<TripConfig>>('/trips'), origins: () => call<List<OriginOption>>('/origins'),
  get: (id: string) => call<TripConfig>(`/trips/${encodeURIComponent(id)}`),
  create: (body: CreateTripRequest) => call<TripConfig>('/trips', 'POST', body),
  patch: (id: string, body: PatchTripRequest) => call<TripConfig>(`/trips/${encodeURIComponent(id)}`, 'PATCH', body),
};

import type { Failure, Health, Success } from '@tripmate/contracts';
export async function getHealth(): Promise<Health> {
  const response = await fetch('/api/v1/health');
  const body = await response.json() as Success<Health> | Failure;
  if (!response.ok || 'error' in body) throw new Error('error' in body ? body.error.message : 'API request failed.');
  return body.data;
}
